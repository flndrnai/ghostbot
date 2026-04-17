'use client';

import { Markdown } from '../../lib/chat/components/markdown.jsx';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';

export function GettingStartedContent({ markdown }) {
  return (
    <div className="flex h-[100dvh] flex-col md:h-[calc(100vh-1px)]">
      <MobilePageHeader title="Getting started" />
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Getting started with GhostBot</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          What GhostBot is, your first 15 minutes, what to do with it, and what it&apos;s not built for.
        </p>
      </div>
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <article className="prose prose-invert max-w-none text-sm leading-relaxed">
            <Markdown>{markdown}</Markdown>
          </article>
        </div>
      </main>
    </div>
  );
}
