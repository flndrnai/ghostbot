import { auth } from '../../../../../../lib/auth/config.js';
import { getProjectById, resolveProjectPath } from '../../../../../../lib/db/projects.js';
import { readFile, writeFile, deleteFileOrFolder } from '../../../../../../lib/projects/files.js';
import { enforceRateLimit } from '../../../../../../lib/rate-limit.js';

async function getAuthedProject(params, session) {
  const { projectId, filePath } = await params;
  const project = getProjectById(projectId);
  if (!project) return { error: Response.json({ error: 'Not found' }, { status: 404 }) };
  if (project.userId !== session.user.id) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  const relativePath = Array.isArray(filePath) ? filePath.join('/') : filePath;
  return { project, relativePath };
}

export async function GET(request, { params }) {
  const limited = enforceRateLimit(request, 'files:read', { limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAuthedProject(params, session);
  if (result.error) return result.error;

  try {
    const root = resolveProjectPath(result.project.path);
    const file = readFile(root, result.relativePath);
    return Response.json({ file });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  const limited = enforceRateLimit(request, 'files:write', { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAuthedProject(params, session);
  if (result.error) return result.error;

  const body = await request.json();
  if (typeof body.content !== 'string') {
    return Response.json({ error: 'Content is required' }, { status: 400 });
  }

  try {
    const root = resolveProjectPath(result.project.path);
    const written = writeFile(root, result.relativePath, body.content);
    return Response.json({ success: true, ...written });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAuthedProject(params, session);
  if (result.error) return result.error;

  try {
    const root = resolveProjectPath(result.project.path);
    const deleted = deleteFileOrFolder(root, result.relativePath);
    return Response.json({ success: true, ...deleted });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
