'use client';

import { Greeting } from './greeting.jsx';

export function Messages({ messages = [] }) {
  if (messages.length === 0) {
    return <Greeting />;
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-foreground border border-primary/10'
                  : 'bg-muted/60 text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
