import { handleClusterWebhook } from '../../../../../../../lib/cluster/runtime.js';

export async function POST(request, { params }) {
  const { roleId } = await params;

  let payload = {};
  try {
    payload = await request.json();
  } catch {}

  const result = await handleClusterWebhook(roleId, payload);

  if (result?.error) {
    return Response.json({ error: result.error }, { status: 404 });
  }

  return Response.json({ ok: true, ...result });
}
