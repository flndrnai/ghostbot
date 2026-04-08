'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from './ui/sidebar.jsx';
import { ChatNavProvider } from './chat-nav-context.jsx';
import { AppSidebar } from './app-sidebar.jsx';
import { Chat } from './chat.jsx';
import { ChatErrorBoundary } from './error-boundary.jsx';

function MobileHeader() {
  return (
    <div className="flex md:hidden items-center gap-3 border-b border-border/50 px-4 py-3 bg-background/80 backdrop-blur-sm safe-top">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <img src="/ghostbot-icon.svg" alt="" className="h-5 w-5" />
        <span className="text-sm font-semibold tracking-tight text-primary">GhostBot</span>
      </div>
    </div>
  );
}

export function ChatPage({ session, chatId, initialMessages, initialStreaming = false }) {
  return (
    <ChatNavProvider>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <MobileHeader />
          <div className="flex flex-1 flex-col h-[100dvh] md:h-[calc(100vh-1px)]">
            <ChatErrorBoundary>
              <Chat
                chatId={chatId}
                initialMessages={initialMessages}
                initialStreaming={initialStreaming}
                session={session}
              />
            </ChatErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
