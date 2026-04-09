import { auth } from '../../../../../lib/auth/config.js';
import { getProjectById, resolveProjectPath } from '../../../../../lib/db/projects.js';
import { listFiles, createFileOrFolder } from '../../../../../lib/projects/files.js';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });
  if (project.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const subPath = url.searchParams.get('path') || '';

  try {
    const root = resolveProjectPath(project.path);
    const tree = listFiles(root, subPath);
    return Response.json({ files: tree });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });
  if (project.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const targetPath = (body.path || '').trim();
  if (!targetPath) return Response.json({ error: 'Path is required' }, { status: 400 });

  try {
    const root = resolveProjectPath(project.path);
    const result = createFileOrFolder(root, targetPath, body.type || 'file');
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
