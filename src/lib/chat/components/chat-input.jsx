'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ChatInput() {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  }

  const hasValue = value.trim().length > 0;

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5 safe-bottom">
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            className={`
              w-full resize-none rounded-2xl border bg-muted/50
              pl-5 pr-14 py-4 text-sm text-foreground leading-relaxed
              placeholder:text-muted-foreground/40
              focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/30
              transition-all duration-200
              ${hasValue ? 'border-primary/20' : 'border-border/60'}
            `}
          />
          <button
            disabled={!hasValue}
            className={`
              absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center
              rounded-xl transition-all duration-200 cursor-pointer
              ${hasValue
                ? 'bg-primary text-primary-foreground shadow-[0_0_16px_rgba(212,175,55,0.2)] hover:shadow-[0_0_24px_rgba(212,175,55,0.3)] active:scale-95'
                : 'bg-muted text-muted-foreground/30'
              }
            `}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/30">
          GhostBot may make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
