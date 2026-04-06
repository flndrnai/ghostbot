'use client';

import { useRef, useEffect } from 'react';
import { Greeting } from './greeting.jsx';
import { ThinkingMessage } from './thinking-message.jsx';

export function Messages({ messages = [], isLoading = false, onSuggestion }) {
  const endRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return <Greeting onSuggestion={onSuggestion} />;
  }

  return (
    <div ref={containerRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-foreground border border-primary/10'
                  : 'bg-muted/60 text-foreground'
              }`}
            >
              {msg.content || msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || ''}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <ThinkingMessage />
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
