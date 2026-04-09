import { auth } from '../../../../../lib/auth/config.js';
import { getProjectById } from '../../../../../lib/db/projects.js';
import { createChat, connectProjectToChat } from '../../../../../lib/db/chats.js';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (project.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const title = (body.title || project.name || 'Project').trim();

  // Create an empty chat with the project name as title
  const chat = createChat(session.user.id, title);

  // Connect the project to this chat
  connectProjectToChat(chat.id, projectId);

  return Response.json({ chatId: chat.id });
}
