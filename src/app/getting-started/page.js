import fs from 'fs';
import path from 'path';
import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset } from '../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../lib/chat/components/app-sidebar.jsx';
import { GettingStartedContent } from './getting-started-content.jsx';

// The canonical content lives next to this page at content.md (and its
// sibling copy at docs/GETTING_STARTED.md for GitHub visitors).
//
// We resolve via process.cwd() NOT import.meta.url, because Next compiles
// page.js into .next/server/... while the source content.md stays at
// app/getting-started/content.md. cwd is stable: it's the repo `src/`
// dir in dev and `/app` inside the production container.

export const dynamic = 'force-dynamic';

function loadGettingStarted() {
  const filePath = path.join(process.cwd(), 'app', 'getting-started', 'content.md');
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
