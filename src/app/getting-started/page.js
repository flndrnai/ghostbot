import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatNavProvider } from '../../lib/chat/components/chat-nav-context.jsx';
import { SidebarProvider, SidebarInset } from '../../lib/chat/components/ui/sidebar.jsx';
import { AppSidebar } from '../../lib/chat/components/app-sidebar.jsx';
import { GettingStartedContent } from './getting-started-content.jsx';

// The canonical content lives next to this page (content.md) so it's
// included in the Docker build context. A sibling copy at
// docs/GETTING_STARTED.md is maintained for GitHub visitors — keep the
// two in sync when editing (both get refreshed via the same PR).

export const dynamic = 'force-dynamic';

function loadGettingStarted() {
  // Resolve the file path relative to THIS source file, so it works the
  // same in dev and in the production container (where /app/src/app/...
  // is the bundled layout).
  const here = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(here, 'content.md');
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
