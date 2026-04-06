import { auth } from '../../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { getCodeWorkspaceById } from '../../../lib/db/code-workspaces.js';
import { WorkspacePage } from './workspace-page.jsx';

export default async function CodeWorkspacePage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { workspaceId } = await params;
  const workspace = getCodeWorkspaceById(workspaceId);

  if (!workspace || workspace.userId !== session.user.id) redirect('/');

  return <WorkspacePage workspace={workspace} session={session} />;
}
