'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils.js';

// Grouped by purpose so related items are next to each other.
// Renders as flex-wrap rows with thin dividers between groups —
// no horizontal scrolling, fits naturally on every viewport.
const tabGroups = [
  {
    label: 'Core',
    tabs: [
      { href: '/admin/llms', label: 'LLM Providers' },
      { href: '/admin/ollama', label: 'Ollama' },
      { href: '/admin/chat', label: 'Chat' },
      { href: '/admin/memory', label: 'Memory' },
      { href: '/admin/agents', label: 'Agents' },
    ],
  },
  {
    label: 'Integrations',
    tabs: [
      { href: '/admin/github', label: 'GitHub' },
      { href: '/admin/telegram', label: 'Telegram' },
      { href: '/admin/slack', label: 'Slack' },
    ],
  },
  {
    label: 'Automation',
    tabs: [
      { href: '/admin/triggers', label: 'Triggers' },
      { href: '/admin/crons', label: 'Crons' },
    ],
  },
  {
    label: 'Ops',
    tabs: [
      { href: '/admin/containers', label: 'Containers' },
      { href: '/admin/monitoring', label: 'Monitoring' },
      { href: '/admin/backup', label: 'Backup' },
      { href: '/admin/users', label: 'Users' },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mb-px">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
        {tabGroups.map((group, gi) => (
          <div key={group.label} className="flex items-center">
            {gi > 0 && (
              <span
                className="mx-2 h-5 w-px bg-border/60 hidden sm:block"
                aria-hidden="true"
              />
            )}
            {group.tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                  pathname === tab.href
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
