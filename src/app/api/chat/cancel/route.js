import { auth } from '../../../../lib/auth/config.js';
import { abortChatStream } from '../../../../lib/ai/live-chats.js';
import { getChatById } from '../../../../lib/db/chats.js';

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chatId = body?.chatId;
  if (!chatId) {
    return Response.json({ error: 'chatId required' }, { status: 400 });
  }

  // Verify ownership — never let one user cancel another user's stream
  const chat = getChatById(chatId);
  if (!chat || chat.userId !== session.user.id) {
    return Response.json({ error: 'Chat not found' }, { status: 404 });
  }

  const cancelled = abortChatStream(chatId);
  return Response.json({ success: true, cancelled });
}
