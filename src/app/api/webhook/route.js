import { fireTriggers } from '../../../lib/triggers.js';

export async function POST(request) {
  const url = new URL(request.url);
  const watchPath = url.pathname.replace('/api/webhook', '') || '/';

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const query = Object.fromEntries(url.searchParams);
  const headers = Object.fromEntries(request.headers);

  fireTriggers(watchPath, { body, query, headers });

  return Response.json({ ok: true });
}
