import { auth } from '../../../lib/auth/config.js';
import { getChatsByUserId } from '../../../lib/db/chats.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

export async function GET(request) {
  const limited = enforceRateLimit(request, 'chats:list', { limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const chats = getChatsByUserId(session.user.id);
  return Response.json(chats);
}
