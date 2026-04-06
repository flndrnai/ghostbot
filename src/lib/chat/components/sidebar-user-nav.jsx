'use client';

import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun } from '../../icons/index.jsx';
import { useSidebar, SidebarMenuButton } from './ui/sidebar.jsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu.jsx';

export function SidebarUserNav({ session }) {
  const { open } = useSidebar();
  const { theme, setTheme } = useTheme();

  const email = session?.user?.email || 'User';
  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="hover:bg-sidebar-accent/50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
            {initial}
          </span>
          {open && <span className="truncate text-sm text-sidebar-foreground/80">{email}</span>}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            try {
              await signOut({ redirect: false });
            } catch {}
            window.location.href = '/login';
          }}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
