'use client';

import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun, BookOpen, ChevronsUpDown } from '../../icons/index.jsx';
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
    <DropdownMenu fullWidth>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="hover:bg-sidebar-accent/50 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary flex-shrink-0">
            {initial}
          </span>
          {open && (
            <>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-semibold text-sidebar-foreground truncate">Account</span>
                <span className="block text-[11px] text-sidebar-foreground/60 truncate">{email}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
            </>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="p-0 overflow-hidden"
      >
        {/* Header — avatar + email + theme toggle, no bottom border */}
        <div className="flex items-start justify-between gap-3 px-3 py-3 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary flex-shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">My Account</div>
              <div className="text-[11px] text-muted-foreground truncate">{email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground/80 hover:text-primary hover:border-primary/40 transition-colors flex-shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Menu items */}
        <div className="py-1">
          <DropdownMenuItem onClick={() => { window.location.href = '/docs'; }}>
            <BookOpen className="h-4 w-4" />
            Docs
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Log out */}
        <div className="py-1">
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
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
