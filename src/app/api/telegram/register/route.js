import { auth } from '../../../../lib/auth/config.js';
import { getConfig } from '../../../../lib/config.js';
import { registerWebhook } from '../../../../lib/tools/telegram.js';

export async function POST(request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  const botToken = getConfig('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    return Response.json({ error: 'Bot token not configured' }, { status: 400 });
  }

  const body = await request.json();
  const webhookUrl = body.webhookUrl;
  if (!webhookUrl) {
    return Response.json({ error: 'Webhook URL is required' }, { status: 400 });
  }

  const secret = getConfig('TELEGRAM_WEBHOOK_SECRET') || crypto.randomUUID();

  try {
    const result = await registerWebhook(botToken, `${webhookUrl}/api/telegram/webhook`, secret);
    return Response.json({ success: result.ok, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
