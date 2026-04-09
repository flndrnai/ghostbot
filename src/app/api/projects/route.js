import { auth } from '../../../lib/auth/config.js';
import { createProject, getProjectsByUser } from '../../../lib/db/projects.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

export async function GET(request) {
  const limited = enforceRateLimit(request, 'projects:list', { limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const list = getProjectsByUser(session.user.id);
  return Response.json({ projects: list });
}

export async function POST(request) {
  const limited = enforceRateLimit(request, 'projects:create', { limit: 10, windowMs: 60 * 1000 });
  if (limited) return limited;

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
