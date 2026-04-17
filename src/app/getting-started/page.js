import fs from 'fs';
import path from 'path';
import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset } from '../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../lib/chat/components/app-sidebar.jsx';
import { GettingStartedContent } from './getting-started-content.jsx';
import { PROJECT_ROOT } from '../../lib/paths.js';

// Server component: reads docs/GETTING_STARTED.md from disk and hands the raw
// markdown to the client renderer. Source of truth stays in the single .md file
// — the public GitHub version and the in-app version are identical by construction.

export const dynamic = 'force-dynamic';

function loadGettingStarted() {
  const filePath = path.join(PROJECT_ROOT, 'docs', 'GETTING_STARTED.md');
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '# Getting Started\n\n_Content not found. See [docs/GETTING_STARTED.md](https://github.com/flndrnai/ghostbot/blob/main/docs/GETTING_STARTED.md) on GitHub._';
  }
}

export default async function GettingStartedPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const markdown = loadGettingStarted();

  return (
    <ChatNavProvider>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <GettingStartedContent markdown={markdown} />
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
