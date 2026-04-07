'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Messages } from './messages.jsx';
import { ChatInput } from './chat-input.jsx';
import { useChatNav } from './chat-nav-context.jsx';

export function Chat({ chatId: initialChatId, initialMessages = [], session }) {
  const { triggerRefresh } = useChatNav();
  const chatIdRef = useRef(initialChatId || null);
  const [localInput, setLocalInput] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync initial messages when chat ID changes
  useEffect(() => {
    setMessages(initialMessages);
    chatIdRef.current = initialChatId || null;
  }, [initialChatId, initialMessages]);

  const handleSend = useCallback(
    async (text) => {
      const message = (text || localInput || '').trim();
      if (!message || isLoading) return;

      setLocalInput('');
      setError(null);

      // Add user message immediately
      const userMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: message,
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
          throw new Error(`Server error: ${response.status}`);
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
    [localInput, isLoading, messages, triggerRefresh],
  );

  return (
    <div className="flex h-full flex-col">
      <Messages messages={messages} isLoading={isLoading} onSuggestion={handleSend} />
      {error && (
        <div className="mx-4 mb-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error.message || 'Something went wrong. Please try again.'}
        </div>
      )}
      <ChatInput
        input={localInput}
        onInputChange={setLocalInput}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  );
}
