import { auth } from '../../../../lib/auth/config.js';
import { getOrCreateMemory, updateMemory, getTodayLog, getYesterdayLog } from '../../../../lib/memory/persistent.js';
import { enforceRateLimit } from '../../../../lib/rate-limit.js';

export async function GET(request) {
  const limited = enforceRateLimit(request, 'memory:read', { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const memory = getOrCreateMemory(session.user.id);
  const todayLog = getTodayLog(session.user.id);
  const yesterdayLog = getYesterdayLog(session.user.id);

  return Response.json({ memory, todayLog, yesterdayLog });
}

export async function PUT(request) {
  const limited = enforceRateLimit(request, 'memory:write', { limit: 10, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (typeof body.content !== 'string') {
    return Response.json({ error: 'Content is required' }, { status: 400 });
  }

  updateMemory(session.user.id, body.content);
  return Response.json({ success: true });
}
