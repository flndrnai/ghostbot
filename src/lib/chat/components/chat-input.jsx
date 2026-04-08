'use client';

import { useRef, useEffect } from 'react';
import { ArrowUp, Square, Wrench, MessageSquare } from '../../icons/index.jsx';

export function ChatInput(props) {
  const input = props.input || '';
  const onInputChange = props.onInputChange;
  const onSend = props.onSend;
  const isLoading = props.isLoading || false;
  const agentMode = !!props.agentMode;
  const onToggleMode = props.onToggleMode;

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
      if (typeof onSend === 'function') {
        onSend();
      } else {
        console.error('[ChatInput] onSend is not a function:', typeof onSend);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (typeof onSend === 'function') {
      onSend();
    }
  }

  function handleChange(e) {
    if (typeof onInputChange === 'function') {
      onInputChange(e.target.value);
    }
  }

  const hasValue = input.trim().length > 0;

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-3 pt-3 pb-5 sm:px-6 sm:pt-5 sm:pb-10 safe-bottom">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="chat-message-input"
              name="message"
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={agentMode ? 'Describe the coding task for the agent...' : 'Send a message...'}
              rows={1}
              disabled={isLoading}
              autoComplete="off"
              className={`
                w-full resize-none rounded-2xl border bg-muted/50
                pl-14 pr-14 py-4 text-sm text-foreground leading-relaxed
                placeholder:text-muted-foreground/40
                focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/30
                transition-all duration-200
                disabled:opacity-60
                ${agentMode ? 'border-primary/40' : hasValue ? 'border-primary/20' : 'border-border/60'}
              `}
            />
            <button
              type="button"
              onClick={() => typeof onToggleMode === 'function' && onToggleMode(!agentMode)}
              className={`absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${agentMode ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/60 text-muted-foreground hover:text-foreground'}`}
              title={agentMode ? 'Agent mode ON — click to switch to chat' : 'Chat mode — click to switch to agent job'}
            >
              {agentMode ? <Wrench className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              disabled={!hasValue || isLoading}
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
        <p className="mt-3 text-center text-xs text-foreground/80">
          {agentMode
            ? 'Agent mode: the next message launches a coding agent that can edit code and open a PR.'
            : 'GhostBot may make mistakes. Verify important information.'}
        </p>
      </div>
    </div>
  );
}
