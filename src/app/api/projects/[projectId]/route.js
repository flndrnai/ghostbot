import { auth } from '../../../../lib/auth/config.js';
import { getProjectById, updateProject, deleteProject } from '../../../../lib/db/projects.js';

async function getAuthedProject(params, session) {
  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) return { error: Response.json({ error: 'Not found' }, { status: 404 }) };
  if (project.userId !== session.user.id) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  return { project };
}

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { project, error } = await getAuthedProject(params, session);
  if (error) return error;

  return Response.json({ project });
}

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { project, error } = await getAuthedProject(params, session);
  if (error) return error;

  const body = await request.json();
  const updates = {};
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.description !== undefined) updates.description = String(body.description).trim();

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 });
  }

  updateProject(project.id, updates);
  return Response.json({ success: true });
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { project, error } = await getAuthedProject(params, session);
  if (error) return error;

  deleteProject(project.id);
  return Response.json({ success: true });
}
