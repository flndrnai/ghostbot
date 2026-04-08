'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun, BookOpen, User, ChevronsUpDown } from '../../icons/index.jsx';
import { useSidebar, SidebarMenuButton } from './ui/sidebar.jsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu.jsx';
import { getMyProfile } from '../../profile/actions.js';
import { useChatNav } from './chat-nav-context.jsx';

export function SidebarUserNav({ session }) {
  const { open } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { registerProfileHandler } = useChatNav();
  const [profile, setProfile] = useState(null);

  const reload = useCallback(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Initial load
  useEffect(() => {
    return reload();
  }, [reload]);

  // Live refresh when profile is saved on any device
  useEffect(() => {
    if (!registerProfileHandler) return;
    return registerProfileHandler(() => {
      reload();
    });
  }, [registerProfileHandler, reload]);

  const email = profile?.email || session?.user?.email || 'User';
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  const initial = (displayName || email).charAt(0).toUpperCase();
  const avatarUrl = profile?.avatarDataUrl || '';

  return (
    <DropdownMenu fullWidth>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="hover:bg-sidebar-accent/50 group">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-lg object-cover flex-shrink-0 border border-border/40"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary flex-shrink-0">
              {initial}
            </span>
          )}
          {open && (
            <>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-semibold text-sidebar-foreground truncate">{displayName || 'Account'}</span>
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border/40"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary flex-shrink-0">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{displayName || 'My Account'}</div>
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
          <DropdownMenuItem onClick={() => { window.location.href = '/profile'; }}>
            <User className="h-4 w-4" />
            Profile
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
