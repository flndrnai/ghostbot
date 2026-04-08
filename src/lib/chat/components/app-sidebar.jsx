'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts.js';
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help.jsx';
import { useChatNav } from './chat-nav-context.jsx';
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
  const pathname = usePathname();
  const { open, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const { streamingChatId } = useChatNav();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // If there's a chat currently streaming on the server, the
  // 'Chat' sidebar button should jump back into it instead of
  // opening a fresh empty conversation.
  const chatHref = streamingChatId ? `/chat/${streamingChatId}` : '/';

  const isChat = pathname === '/' || pathname?.startsWith('/chat');
  const isClusters = pathname?.startsWith('/clusters') || pathname?.startsWith('/cluster');
  const isAdmin = pathname?.startsWith('/admin');

  function handleNewChat() {
    router.push('/');
    if (isMobile) setOpenMobile(false);
  }

  // Global keyboard shortcuts — active on every page that mounts the sidebar.
  useKeyboardShortcuts({
    'mod+b': () => {
      if (isMobile) {
        setOpenMobile((v) => !v);
      } else {
        toggleSidebar();
      }
    },
    'mod+k': () => {
      const el = document.getElementById('chat-message-input');
      if (el) {
        el.focus();
        // Scroll into view on mobile where the input can be off-screen
        el.scrollIntoView({ block: 'nearest' });
      } else {
        // Not on a chat page — go home
        router.push('/');
      }
    },
    'mod+shift+n': () => {
      router.push('/');
      if (isMobile) setOpenMobile(false);
    },
    'mod+/': () => setShowShortcuts((v) => !v),
    'escape': () => setShowShortcuts(false),
  });

  return (
    <>
      <KeyboardShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <Sidebar>
      <SidebarHeader>
        {open ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <img src="/ghostbot-icon.svg" alt="" className="h-6 w-6" />
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
              href="/"
              tooltip="New Chat"
              onClick={() => { if (isMobile) setOpenMobile(false); }}
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
              <SidebarMenuButton href={chatHref} isActive={isChat} tooltip={streamingChatId ? 'Resume chat (streaming)' : 'Chat'} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                <MessageSquare className="h-4 w-4" />
                {open && 'Chat'}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/clusters" isActive={isClusters} tooltip="Clusters" onClick={() => { if (isMobile) setOpenMobile(false); }}>
                <Sparkles className="h-4 w-4" />
                {open && 'Clusters'}
              </SidebarMenuButton>
            </SidebarMenuItem>
            {session?.user?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/admin" isActive={isAdmin} tooltip="Admin" onClick={() => { if (isMobile) setOpenMobile(false); }}>
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
        {open && (
          <a
            href="https://flndrn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50 hover:text-[#fbe731] transition-colors"
          >
            <span>{new Date().getFullYear()} GhostBot by</span>
            <span className="font-semibold" style={{ color: '#fbe731' }}>flndrn</span>
            <img src="/flndrn-icon.svg" alt="flndrn" className="h-4 w-4" />
          </a>
        )}
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
