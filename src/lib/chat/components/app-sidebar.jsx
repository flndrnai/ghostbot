'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Settings, Plus } from '../../icons/index.jsx';
import { Sparkles } from 'lucide-react';
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
import { SidebarHistory } from './sidebar-history.jsx';

export function AppSidebar({ session }) {
  const router = useRouter();
  const { open, isMobile, setOpenMobile } = useSidebar();

  function handleNewChat() {
    router.push('/');
    if (isMobile) setOpenMobile(false);
  }

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Chat"
              onClick={handleNewChat}
              className="border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 text-primary" />
              {open && <span className="text-primary">New Chat</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Chat" onClick={() => { router.push('/'); if (isMobile) setOpenMobile(false); }}>
                <MessageSquare className="h-4 w-4" />
                {open && 'Chat'}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Clusters" onClick={() => { router.push('/clusters'); if (isMobile) setOpenMobile(false); }}>
                <Sparkles className="h-4 w-4" />
                {open && 'Clusters'}
              </SidebarMenuButton>
            </SidebarMenuItem>
            {session?.user?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Admin" onClick={() => { router.push('/admin'); if (isMobile) setOpenMobile(false); }}>
                  <Settings className="h-4 w-4" />
                  {open && 'Admin'}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarHistory />
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
