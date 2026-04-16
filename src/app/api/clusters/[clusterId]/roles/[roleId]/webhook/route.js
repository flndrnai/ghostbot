import crypto from 'crypto';
import { handleClusterWebhook } from '../../../../../../../lib/cluster/runtime.js';
import { getRoleWithCluster } from '../../../../../../../lib/db/clusters.js';

// Authenticated cluster-role webhook receiver.
//
// The caller MUST provide `X-GhostBot-Signature: sha256=<hex>` where the
// HMAC is computed over the raw body using the role's `triggerConfig.webhookSecret`.
// Roles without a webhookSecret cannot be invoked via this endpoint (fail-closed).
// The URL's `clusterId` must also match the role's actual cluster.
//
// Previously: no authentication, no signature. Any POST to a known roleId
// launched an agent-job container with an attacker-controllable payload
// injected into the cluster system prompt.

export async function POST(request, { params }) {
  const { clusterId, roleId } = await params;

  const role = getRoleWithCluster(roleId);
  if (!role) {
    // Avoid distinguishing "role doesn't exist" from "role exists but wrong cluster"
    return new Response('Forbidden', { status: 403 });
  }

  // Ensure the URL's clusterId matches — prevents using a leaked roleId
  // under an unrelated cluster path.
  if (role.cluster?.id !== clusterId) {
    return new Response('Forbidden', { status: 403 });
  }

  let config = {};
  try {
    config = typeof role.triggerConfig === 'string'
      ? JSON.parse(role.triggerConfig)
      : (role.triggerConfig || {});
  } catch {}

  const webhookSecret = config.webhookSecret;
  if (!webhookSecret) {
    return new Response('Role webhook secret not configured', { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-ghostbot-signature') || '';
  if (!signature) {
    return new Response('Missing signature', { status: 403 });
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return new Response('Forbidden', { status: 403 });
  }

  let payload = {};
  try { payload = JSON.parse(rawBody); } catch {}

  const result = await handleClusterWebhook(roleId, payload);

  if (result?.error) {
    return Response.json({ error: result.error }, { status: 404 });
  }

  return Response.json({ ok: true, ...result });
}
