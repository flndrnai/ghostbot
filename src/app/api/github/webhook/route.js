import crypto from 'crypto';
import { getConfig } from '../../../../lib/config.js';
import { createNotification } from '../../../../lib/db/notifications.js';
import { fireTriggers } from '../../../../lib/triggers.js';

export async function POST(request) {
  // Validate webhook secret
  const signature = request.headers.get('x-hub-signature-256');
  const webhookSecret = getConfig('GITHUB_WEBHOOK_SECRET');

  const bodyText = await request.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (webhookSecret && signature) {
    const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(bodyText).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const event = request.headers.get('x-github-event') || 'unknown';
  console.log(`[github] webhook event: ${event}`);

  // Handle pull request events
  if (event === 'pull_request') {
    const action = body.action;
    const pr = body.pull_request;

    if (action === 'closed' && pr?.merged) {
      createNotification(
        `PR #${pr.number} merged: ${pr.title}`,
        { event, action, pr_number: pr.number, title: pr.title },
      );
    } else if (action === 'opened') {
      createNotification(
        `PR #${pr.number} opened: ${pr.title}`,
        { event, action, pr_number: pr.number, title: pr.title },
      );
    }
  }

  // Fire any matching triggers
  fireTriggers(`/github/${event}`, {
    body,
    headers: Object.fromEntries(request.headers),
  });

  return Response.json({ ok: true });
}
