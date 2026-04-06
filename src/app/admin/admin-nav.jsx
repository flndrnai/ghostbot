'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils.js';

const tabs = [
  { href: '/admin/llms', label: 'LLM Providers' },
  { href: '/admin/ollama', label: 'Ollama Setup' },
  { href: '/admin/chat', label: 'Chat Settings' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto px-6 flex gap-1 overflow-x-auto">
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
