import { auth } from '../../../lib/auth/config.js';
import { getChatsByUserId } from '../../../lib/db/chats.js';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const chats = getChatsByUserId(session.user.id);
  return Response.json(chats);
}
