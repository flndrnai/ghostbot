import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset } from '../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../lib/chat/components/app-sidebar.jsx';
import { ClustersContent } from './clusters-content.jsx';

export default async function ClustersPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <ChatNavProvider>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <ClustersContent />
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
