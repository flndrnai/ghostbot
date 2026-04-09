import { auth } from '../../../../../lib/auth/config.js';
import { getProjectById } from '../../../../../lib/db/projects.js';
import { getChatById, connectProjectToChat, disconnectProjectFromChat } from '../../../../../lib/db/chats.js';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (project.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const chatId = body.chatId;
  if (!chatId) return Response.json({ error: 'chatId is required' }, { status: 400 });

  const chat = getChatById(chatId);
  if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });
  if (chat.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  connectProjectToChat(chatId, projectId);
  return Response.json({ success: true });
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const chatId = body.chatId;
  if (!chatId) return Response.json({ error: 'chatId is required' }, { status: 400 });

  const chat = getChatById(chatId);
  if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });
  if (chat.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  disconnectProjectFromChat(chatId);
  return Response.json({ success: true });
}
