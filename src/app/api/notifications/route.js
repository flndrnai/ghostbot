import { auth } from '../../../lib/auth/config.js';
import { getNotifications, getUnreadCount, markAllRead } from '../../../lib/db/notifications.js';

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const items = getNotifications(limit, offset);
  const unread = getUnreadCount();

  return Response.json({ items, unread });
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();

  if (body.action === 'mark-all-read') {
    markAllRead();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
