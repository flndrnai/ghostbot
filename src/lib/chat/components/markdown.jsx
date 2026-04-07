'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded border border-border/50 bg-background/80 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

const components = {
  // Paragraphs
  p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
  // Headings — kept tight so they don't dominate the chat
  h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1.5">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
  // Lists
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  // Links
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
      {children}
    </a>
  ),
  // Strong / emphasis
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-foreground/80 italic">{children}</blockquote>
  ),
  // Inline vs block code
  code: ({ inline, className, children, ...props }) => {
    const text = String(children || '').replace(/\n$/, '');
    if (inline) {
      return (
        <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[12px] font-mono text-primary border border-border/30">{children}</code>
      );
    }
    const lang = /language-(\w+)/.exec(className || '')?.[1];
    return (
      <div className="relative group my-2">
        <pre className="bg-background/60 border border-border/60 rounded-lg overflow-x-auto p-3 text-[12px] font-mono leading-relaxed">
          {lang && (
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{lang}</span>
          )}
          <code {...props}>{children}</code>
        </pre>
        <CopyButton text={text} />
      </div>
    );
  },
  pre: ({ children }) => <>{children}</>, // code handles its own wrapper
  // Table support
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="text-[12px] border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border/60 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border/60 px-2 py-1">{children}</td>,
  hr: () => <hr className="my-3 border-border/40" />,
};

export function Markdown({ children }) {
  if (!children) return null;
  return (
    <div className="text-sm">
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
