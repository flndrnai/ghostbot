'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Messages } from './messages.jsx';
import { ChatInput } from './chat-input.jsx';
import { useChatNav } from './chat-nav-context.jsx';

function sanitizeMessages(arr) {
  return (Array.isArray(arr) ? arr : []).filter(
    (m) => m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  );
}

export function Chat({ chatId: initialChatId, initialMessages = [], initialStreaming = false, session }) {
  const { triggerRefresh, registerMessageHandler, registerAgentJobHandler, registerStreamingHandler } = useChatNav();
  const chatIdRef = useRef(initialChatId || null);
  const [localInput, setLocalInput] = useState('');
  const [messages, setMessages] = useState(() => sanitizeMessages(initialMessages));
  const [isLoading, setIsLoading] = useState(false);
  // Tracks whether THIS chat has a stream still running on the
  // server. Initialized from the SSR-passed initialStreaming flag
  // so the thinking dots reappear when navigating back.
  const [serverStreaming, setServerStreaming] = useState(initialStreaming);
  const [error, setError] = useState(null);
  const [agentMode, setAgentMode] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Sync initial messages ONLY when the chat ID actually changes,
  // not when initialMessages reference changes (parent re-renders create
  // a new [] every time and would wipe streamed-in messages).
  useEffect(() => {
    setMessages(sanitizeMessages(initialMessages));
    setServerStreaming(initialStreaming);
    chatIdRef.current = initialChatId || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId]);

  // Subscribe to chat:streaming-start / chat:streaming-end events
  // for THIS chat. Toggles the dots-on-mount indicator without
  // requiring a fresh fetch from the client.
  useEffect(() => {
    if (!initialChatId || !registerStreamingHandler) return;
    const handler = (event) => {
      if (!event || event.chatId !== initialChatId) return;
      if (event.type === 'chat:streaming-start') setServerStreaming(true);
      if (event.type === 'chat:streaming-end') setServerStreaming(false);
    };
    return registerStreamingHandler(handler);
  }, [initialChatId, registerStreamingHandler]);

  // Load existing agent jobs for this chat on mount / chat change
  useEffect(() => {
    if (!initialChatId) {
      setJobs([]);
      return;
    }
    fetch(`/api/agent-jobs?chatId=${encodeURIComponent(initialChatId)}`)
      .then((r) => r.ok ? r.json() : { jobs: [] })
      .then((data) => setJobs(Array.isArray(data.jobs) ? data.jobs : []))
      .catch(() => {});
  }, [initialChatId]);

  // Live agent job sync — updates status and logs via SSE
  useEffect(() => {
    if (!initialChatId || !registerAgentJobHandler) return;
    const handler = (event) => {
      if (!event) return;
      if (event.type === 'agent-job:created') {
        if (event.job?.chatId !== initialChatId) return;
        setJobs((prev) => {
          if (prev.some((j) => j.id === event.job.id)) return prev;
          return [event.job, ...prev];
        });
      } else if (event.type === 'agent-job:updated') {
        if (event.job?.chatId !== initialChatId) return;
        setJobs((prev) => prev.map((j) => (j.id === event.job.id ? { ...j, ...event.job } : j)));
      } else if (event.type === 'agent-job:log') {
        if (event.chatId !== initialChatId) return;
        setJobs((prev) => prev.map((j) => (
          j.id === event.jobId
            ? { ...j, outputTail: ((j.outputTail || '') + event.chunk).slice(-2000) }
            : j
        )));
      }
    };
    return registerAgentJobHandler(handler);
  }, [initialChatId, registerAgentJobHandler]);

  // Cross-device live sync: receive messages saved by other devices in this chat.
  useEffect(() => {
    if (!initialChatId) return;
    const handler = (incomingMsg) => {
      if (!incomingMsg) return;
      setMessages((prev) => {
        // Skip if we already have this message id
        if (prev.some((m) => m.id === incomingMsg.id)) return prev;
        // Skip if the last message has identical role + content (echo from this tab)
        const last = prev[prev.length - 1];
        if (last && last.role === incomingMsg.role && last.content === incomingMsg.content) return prev;
        return [
          ...prev,
          {
            id: incomingMsg.id,
            role: incomingMsg.role,
            content: incomingMsg.content,
            images: incomingMsg.images || undefined,
            parts: [{ type: 'text', text: incomingMsg.content }],
            createdAt: incomingMsg.createdAt || Date.now(),
          },
        ];
      });
    };
    return registerMessageHandler(initialChatId, handler);
  }, [initialChatId, registerMessageHandler]);

  const handleStop = useCallback(async () => {
    const id = chatIdRef.current;
    if (!id) return;
    try {
      await fetch('/api/chat/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: id }),
      });
    } catch {}
    // The server will publish chat:streaming-end on the SSE bus
    // which clears serverStreaming and the thinking dots.
  }, []);

  const handleAgentJob = useCallback(
    async (prompt) => {
      setError(null);
      try {
        const res = await fetch('/api/agent-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: chatIdRef.current, prompt }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to launch agent (${res.status})`);
        }
        // The sync bus will push the agent-job:created event; nothing else to do.
      } catch (err) {
        setError({ message: err.message || 'Failed to launch agent job' });
      }
    },
    [],
  );

  const handleSend = useCallback(
    async (text) => {
      const message = (text || localInput || '').trim();
      if ((!message && !pendingImages.length) || isLoading) return;

      const currentImages = pendingImages.length ? [...pendingImages] : undefined;
      setLocalInput('');
      setPendingImages([]);
      setError(null);

      // Agent mode: fire a job instead of a chat stream.
      if (agentMode) {
        const userMessage = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'user',
          content: message,
          images: currentImages,
          parts: [{ type: 'text', text: message }],
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        await handleAgentJob(message);
        return;
      }

      // Add user message immediately
      const userMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: message,
        images: currentImages,
        parts: [{ type: 'text', text: message }],
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch('/stream/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: chatIdRef.current,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.images ? { images: m.images } : {}),
            })),
          }),
        });

        // Capture chatId from server for new chats
        const serverChatId = response.headers.get('X-Chat-Id');
        if (serverChatId && !chatIdRef.current) {
          chatIdRef.current = serverChatId;
          window.history.replaceState(null, '', `/chat/${serverChatId}`);
        }

        if (!response.ok) {
          if (response.status === 409) {
            // Friendly message for the duplicate-stream guard
            throw new Error('A response is still being generated for this chat. Wait a few seconds and try again.');
          }
          let detail = '';
          try {
            const data = await response.json();
            detail = data?.error ? `: ${data.error}` : '';
          } catch {}
          throw new Error(`Server error: ${response.status}${detail}`);
        }

        // Parse the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          content: '',
          parts: [{ type: 'text', text: '' }],
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            // Parse AI SDK data stream protocol: prefix:JSON
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;
            const prefix = line.slice(0, colonIdx);
            const data = line.slice(colonIdx + 1);

            if (prefix === '0') {
              // Text delta — strip surrounding quotes and unescape
              try {
                const text = JSON.parse(data);
                assistantContent += text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: assistantContent,
                      parts: [{ type: 'text', text: assistantContent }],
                    };
                  }
                  return updated;
                });
              } catch {}
            } else if (prefix === '3') {
              // Error
              try {
                const errMsg = JSON.parse(data);
                setError({ message: errMsg });
              } catch {}
            }
          }
        }

        triggerRefresh?.();
      } catch (err) {
        console.error('[chat] failed:', err);
        setError({ message: err.message || 'Failed to send message' });
      } finally {
        setIsLoading(false);
      }
    },
    [localInput, isLoading, messages, pendingImages, triggerRefresh, agentMode, handleAgentJob],
  );

  return (
    <div className="flex h-full flex-col">
      <Messages messages={messages} isLoading={isLoading || serverStreaming} onSuggestion={handleSend} jobs={jobs} />
      {error && (
        <div className="mx-4 mb-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error.message || 'Something went wrong. Please try again.'}
        </div>
      )}
      <ChatInput
        input={localInput}
        onInputChange={setLocalInput}
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading || serverStreaming}
        agentMode={agentMode}
        onToggleMode={setAgentMode}
        images={pendingImages}
        onImagesChange={setPendingImages}
      />
    </div>
  );
}
