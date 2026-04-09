'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const THEMES = [
  { key: 'dark', icon: Moon, label: 'Dark' },
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-1">
      {THEMES.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={label}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            theme === key
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
