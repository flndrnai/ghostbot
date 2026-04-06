'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useRef } from 'react';
import { Messages } from './messages.jsx';
import { ChatInput } from './chat-input.jsx';
import { useChatNav } from './chat-nav-context.jsx';

export function Chat({ chatId: initialChatId, initialMessages = [], session }) {
  const { triggerRefresh } = useChatNav();
  const chatIdRef = useRef(initialChatId || null);
  const isNewChat = !initialChatId;

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/stream/chat',
    id: chatIdRef.current || undefined,
    initialMessages,
    body: {
      chatId: chatIdRef.current,
    },
    onResponse(response) {
      // Capture chatId from server for new chats
      const serverChatId = response.headers.get('X-Chat-Id');
      if (serverChatId && !chatIdRef.current) {
        chatIdRef.current = serverChatId;
        // Update URL without full navigation
        window.history.replaceState(null, '', `/chat/${serverChatId}`);
      }
    },
    onFinish() {
      triggerRefresh?.();
    },
  });

  const handleSend = useCallback(
    (e) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;
      handleSubmit(e);
    },
    [input, isLoading, handleSubmit],
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
        input={input}
        handleInputChange={handleInputChange}
        handleSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  );
}
