'use client';

import { SidebarTrigger } from './ui/sidebar.jsx';

/**
 * A thin mobile-only header strip that exposes the sidebar drawer
 * trigger plus an optional title. Used on every page that mounts
 * the AppSidebar shell so phone users can always swipe back to
 * the sidebar nav. Hidden on desktop.
 */
export function MobilePageHeader({ title }) {
  return (
    <div className="md:hidden flex items-center gap-3 border-b border-border/50 px-3 py-2 bg-background/80 backdrop-blur-sm safe-top sticky top-0 z-20">
      <SidebarTrigger />
      <div className="flex items-center gap-2 min-w-0">
        <img src="/ghostbot-icon.svg" alt="" className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm font-semibold tracking-tight text-primary truncate">
          {title || 'GhostBot'}
        </span>
      </div>
    </div>
  );
}
