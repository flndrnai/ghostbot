'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Settings, Plus, Sparkles } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar.jsx';
import { SidebarUserNav } from './sidebar-user-nav.jsx';

export function AppSidebar({ session }) {
  const router = useRouter();
  const { open } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        {open ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="" className="h-6 w-6" />
              <span className="text-lg font-bold tracking-tight text-primary">GhostBot</span>
            </div>
            <SidebarTrigger />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <SidebarTrigger />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* New Chat — prominent action */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Chat"
              className="border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 text-primary" />
              {open && <span className="text-primary">New Chat</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive tooltip="Chat" onClick={() => router.push('/')}>
                <MessageSquare className="h-4 w-4" />
                {open && 'Chat'}
              </SidebarMenuButton>
            </SidebarMenuItem>
            {session?.user?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Admin" onClick={() => router.push('/admin')}>
                  <Settings className="h-4 w-4" />
                  {open && 'Admin'}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Chat History */}
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              {open && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Sparkles className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/40 leading-relaxed px-2">
                    Your conversations will appear here
                  </p>
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarUserNav session={session} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
