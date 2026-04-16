import crypto from 'crypto';
import { getTriggersForPath, executeTriggerActions } from '../../../lib/triggers.js';

// Generic webhook receiver. Each trigger at `watch_path` must declare a
// `secret` string. We authenticate the caller with HMAC-SHA256 of the raw
// body, header `X-GhostBot-Signature: sha256=<hex>`.
//
// Triggers with no `secret` are IGNORED by this endpoint (fail-closed).
//
// Threat model: admins are trusted to author triggers.json. We defend
// against untrusted callers (the public internet) reaching the trigger
// execution path, since that path reaches `exec(action.command)` with
// attacker-controllable template values when the trigger uses `{{body.*}}`
// or `{{headers.*}}` interpolation.

export async function POST(request) {
  const url = new URL(request.url);
  const watchPath = url.pathname.replace('/api/webhook', '') || '/';

  const rawBody = await request.text();

  const triggers = getTriggersForPath(watchPath);
  if (!triggers || triggers.length === 0) {
    // Return 200 on unknown path to avoid leaking which paths are wired up.
    return Response.json({ ok: true });
  }

  const signature = request.headers.get('x-ghostbot-signature') || '';

  const authorized = [];
  for (const trigger of triggers) {
    if (!trigger.secret) {
      // Triggers without a secret are never eligible on this endpoint.
      continue;
    }
    if (!signature) continue;
    const expected = 'sha256=' + crypto
      .createHmac('sha256', trigger.secret)
      .update(rawBody)
      .digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      authorized.push(trigger);
    }
  }

  if (authorized.length === 0) {
    return new Response('Forbidden', { status: 403 });
  }

  let body = {};
  try { body = JSON.parse(rawBody); } catch {}

  const query = Object.fromEntries(url.searchParams);
  const headers = Object.fromEntries(request.headers);

  executeTriggerActions(authorized, { body, query, headers });

  return Response.json({ ok: true });
}
