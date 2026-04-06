'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useCallback, useRef } from 'react';
import { Messages } from './messages.jsx';
import { ChatInput } from './chat-input.jsx';
import { useChatNav } from './chat-nav-context.jsx';

export function Chat({ chatId: initialChatId, initialMessages = [], session }) {
  const { triggerRefresh } = useChatNav();
  const chatIdRef = useRef(initialChatId || null);
  const [localInput, setLocalInput] = useState('');

  const { messages, status, error, append } = useChat({
    api: '/stream/chat',
    id: chatIdRef.current || undefined,
    initialMessages,
    body: {
      chatId: chatIdRef.current,
    },
    onResponse(response) {
      const serverChatId = response.headers.get('X-Chat-Id');
      if (serverChatId && !chatIdRef.current) {
        chatIdRef.current = serverChatId;
        window.history.replaceState(null, '', `/chat/${serverChatId}`);
      }
    },
    onFinish() {
      triggerRefresh?.();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSend = useCallback(
    (text) => {
      const message = text || localInput;
      if (!message.trim() || isLoading) return;
      setLocalInput('');
      append({ role: 'user', content: message.trim() });
    },
    [localInput, isLoading, append],
  );

  return (
    <div className="flex h-full flex-col">
      <Messages messages={messages} isLoading={isLoading} />
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
