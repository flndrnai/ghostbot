import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../lib/chat/components/app-sidebar.jsx';
import { AdminNav } from './admin-nav.jsx';

export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') redirect('/');

  return (
    <ChatNavProvider>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <div className="min-h-[100dvh] bg-background overflow-x-hidden flex flex-col">
            {/* Top bar — sticky, holds mobile drawer trigger + breadcrumb + tab nav */}
            <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20 safe-top">
              <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                  {/* Hamburger — only visible on mobile (the drawer is hidden md:block on desktop already) */}
                  <div className="md:hidden">
                    <SidebarTrigger />
                  </div>
                  <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
                    <img src="/ghostbot-icon.svg" alt="" className="h-5 w-5" />
                    <span className="text-sm font-semibold text-primary">GhostBot</span>
                  </a>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="text-sm text-foreground font-medium">Admin</span>
                </div>
              </div>
              <AdminNav />
            </div>

            {/* Page content */}
            <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 safe-bottom">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
