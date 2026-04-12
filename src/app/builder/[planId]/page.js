import { auth } from '../../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset } from '../../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../../lib/chat/components/app-sidebar.jsx';
import BuilderContent from './builder-content.jsx';

export const metadata = { title: 'Builder — GhostBot' };

export default async function BuilderPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { planId } = await params;

  return (
    <ChatNavProvider>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <BuilderContent planId={planId} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
