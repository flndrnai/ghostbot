'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils.js';
import { ChevronDown } from '../../lib/icons/index.jsx';

// Core links stay as flat row tabs.
const coreTabs = [
  { href: '/admin/llms', label: 'LLM Providers' },
  { href: '/admin/ollama', label: 'Ollama' },
  { href: '/admin/chat', label: 'Chat' },
  { href: '/admin/memory', label: 'Memory' },
  { href: '/admin/agents', label: 'Agents' },
];

// Everything else lives behind a dropdown button.
const dropdownGroups = [
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

function NavDropdown({ group, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Close after route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isGroupActive = group.tabs.some((t) => pathname === t.href);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 cursor-pointer',
          isGroupActive
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 sm:right-auto sm:left-0 top-full z-50 mt-1 min-w-[180px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border/60 bg-card shadow-xl p-1">
          {group.tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'block px-3 py-2 text-sm rounded-lg transition-colors',
                pathname === tab.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground/90 hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 -mb-px">
      {/* Horizontal scroll on small screens, flex-wrap on sm+ */}
      <div
        className="flex items-center gap-x-1 gap-y-0 overflow-x-auto sm:flex-wrap sm:overflow-visible scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Core flat tabs */}
        {coreTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 flex-shrink-0',
              pathname === tab.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        ))}

        {/* Divider */}
        <span className="mx-2 h-5 w-px bg-border/60 hidden sm:block flex-shrink-0" aria-hidden="true" />

        {/* Dropdown groups */}
        {dropdownGroups.map((g) => (
          <NavDropdown key={g.label} group={g} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}
