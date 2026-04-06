'use client';

import { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

export function ChatInput({ input, onInputChange, onSend, isLoading }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSend();
  }

  const hasValue = input?.trim().length > 0;

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5 safe-bottom">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              disabled={isLoading}
              className={`
                w-full resize-none rounded-2xl border bg-muted/50
                pl-5 pr-14 py-4 text-sm text-foreground leading-relaxed
                placeholder:text-muted-foreground/40
                focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/30
                transition-all duration-200
                disabled:opacity-60
                ${hasValue ? 'border-primary/20' : 'border-border/60'}
              `}
            />
            <button
              type="submit"
              disabled={!hasValue && !isLoading}
              className={`
                absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center
                rounded-xl transition-all duration-200 cursor-pointer
                ${isLoading
                  ? 'bg-destructive/80 text-destructive-foreground hover:bg-destructive'
                  : hasValue
                    ? 'bg-primary text-primary-foreground shadow-[0_0_16px_rgba(212,175,55,0.2)] hover:shadow-[0_0_24px_rgba(212,175,55,0.3)] active:scale-95'
                    : 'bg-muted text-muted-foreground/30'
                }
              `}
            >
              {isLoading ? <Square className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/30">
          GhostBot may make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
