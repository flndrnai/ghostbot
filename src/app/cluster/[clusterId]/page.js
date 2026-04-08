import { auth } from '../../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset } from '../../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../../lib/chat/components/app-sidebar.jsx';
import { ClusterDetailContent } from './cluster-detail-content.jsx';

export default async function ClusterDetailPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <ChatNavProvider>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <ClusterDetailContent />
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
