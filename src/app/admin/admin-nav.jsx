'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils.js';

const tabs = [
  { href: '/admin/llms', label: 'LLM Providers' },
  { href: '/admin/ollama', label: 'Ollama' },
  { href: '/admin/chat', label: 'Chat' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/github', label: 'GitHub' },
  { href: '/admin/telegram', label: 'Telegram' },
  { href: '/admin/triggers', label: 'Triggers' },
  { href: '/admin/crons', label: 'Crons' },
  { href: '/admin/containers', label: 'Containers' },
  { href: '/admin/monitoring', label: 'Monitoring' },
  { href: '/admin/memory', label: 'Memory' },
  { href: '/admin/backup', label: 'Backup' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px',
            pathname === tab.href
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
