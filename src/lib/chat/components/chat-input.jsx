'use client';

import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Wrench, MessageSquare } from '../../icons/index.jsx';

// Only embed text-ish files. Hard cap to prevent blowing up the LLM context.
const MAX_ATTACHMENT_BYTES = 64 * 1024; // 64 KB per file
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'json5',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'php', 'pl', 'sh', 'bash', 'zsh', 'fish',
  'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'm', 'mm',
  'html', 'htm', 'xml', 'svg', 'css', 'scss', 'sass', 'less',
  'sql', 'prisma', 'graphql', 'gql',
  'dockerfile', 'makefile', 'gitignore', 'gitattributes', 'env', 'env.example',
  'lock', 'log', 'csv', 'tsv',
]);

function guessLang(filename) {
  const lower = (filename || '').toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() : lower;
  return TEXT_EXTENSIONS.has(ext) ? ext : '';
}

function isTextFile(file) {
  if (!file) return false;
  if (file.type && (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('xml'))) return true;
  const ext = (file.name || '').toLowerCase().split('.').pop();
  return TEXT_EXTENSIONS.has(ext);
}

export function ChatInput(props) {
  const input = props.input || '';
  const onInputChange = props.onInputChange;
  const onSend = props.onSend;
  const onStop = props.onStop;
  const isLoading = props.isLoading || false;
  const agentMode = !!props.agentMode;
  const onToggleMode = props.onToggleMode;

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsText(file);
    });
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setAttachmentError(null);
    const blocks = [];
    for (const file of files) {
      if (!isTextFile(file)) {
        setAttachmentError(`${file.name}: binary/unknown file type, skipped`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(`${file.name}: over ${Math.round(MAX_ATTACHMENT_BYTES / 1024)} KB limit, skipped`);
        continue;
      }
      try {
        const content = await readFileAsText(file);
        const lang = guessLang(file.name);
        blocks.push(`\n\n\`${file.name}\`\n\`\`\`${lang}\n${content}\n\`\`\``);
      } catch {
        setAttachmentError(`${file.name}: failed to read`);
      }
    }
    if (blocks.length === 0) return;
    const nextValue = (input || '').trimEnd() + blocks.join('');
    if (typeof onInputChange === 'function') onInputChange(nextValue);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    handleFiles(files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setDragActive(false);
  }

  async function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const fileItems = items.filter((it) => it.kind === 'file');
    if (fileItems.length === 0) return; // let the textarea handle normal text paste
    e.preventDefault();
    const files = fileItems.map((it) => it.getAsFile()).filter(Boolean);
    await handleFiles(files);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = ''; // allow same file again
  }

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
    <div className="bg-background/80 backdrop-blur-sm px-3 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-3 safe-bottom">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <div
            className="relative"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {dragActive && (
              <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center pointer-events-none">
                <span className="text-sm font-semibold text-primary">Drop to attach as code block</span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              id="chat-message-input"
              name="message"
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={agentMode ? 'Describe the coding task for the agent...' : 'Send a message…  (drop or paste files to attach)'}
              rows={1}
              disabled={isLoading}
              autoComplete="off"
              style={{ scrollbarWidth: 'none' }}
              className={`
                w-full resize-none rounded-2xl border bg-muted/50
                pl-14 pr-14 py-4 text-sm text-foreground leading-relaxed
                placeholder:text-muted-foreground/40
                focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/30
                transition-all duration-200
                disabled:opacity-60
                [&::-webkit-scrollbar]:hidden
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
            {isLoading ? (
              <button
                type="button"
                onClick={() => { if (typeof onStop === 'function') onStop(); }}
                aria-label="Stop generating"
                className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/80 text-destructive-foreground hover:bg-destructive transition-all duration-200 cursor-pointer active:scale-95"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!hasValue}
                aria-label="Send message"
                className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                  hasValue
                    ? 'bg-primary text-primary-foreground shadow-[0_0_16px_rgba(212,175,55,0.2)] hover:shadow-[0_0_24px_rgba(212,175,55,0.3)] active:scale-95'
                    : 'bg-muted text-muted-foreground/30'
                }`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
        {attachmentError && (
          <p className="mt-2 text-center text-[11px] text-destructive">{attachmentError}</p>
        )}
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-foreground/80">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="underline underline-offset-2 hover:text-primary cursor-pointer"
          >
            Attach file
          </button>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {agentMode
              ? 'Agent mode launches a coding agent on send'
              : 'GhostBot may make mistakes. Verify important info.'}
          </span>
        </div>
      </div>
    </div>
  );
}
