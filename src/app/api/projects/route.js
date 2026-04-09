import { auth } from '../../../lib/auth/config.js';
import { createProject, getProjectsByUser } from '../../../lib/db/projects.js';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const list = getProjectsByUser(session.user.id);
  return Response.json({ projects: list });
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const name = (body.name || '').trim();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  const project = createProject({
    userId: session.user.id,
    name,
    description: (body.description || '').trim(),
  });

  return Response.json({ success: true, project });
}
