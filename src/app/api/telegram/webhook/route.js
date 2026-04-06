import { getConfig } from '../../../../lib/config.js';
import { getTelegramAdapter } from '../../../../lib/channels/index.js';
import { chatStream } from '../../../../lib/ai/index.js';

export async function POST(request) {
  // Validate webhook secret
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = getConfig('TELEGRAM_WEBHOOK_SECRET');
  if (expectedSecret && secret !== expectedSecret) {
    return new Response('Forbidden', { status: 403 });
  }

  const adapter = getTelegramAdapter();
  if (!adapter) {
    return Response.json({ error: 'Telegram not configured' }, { status: 503 });
  }

  try {
    const normalized = await adapter.receive(request);
    if (!normalized) {
      return Response.json({ ok: true }); // Ignored message
    }

    // Process message asynchronously (fire-and-forget)
    processMessage(adapter, normalized).catch((err) => {
      console.error('[telegram] message processing failed:', err.message);
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[telegram] webhook error:', error.message);
    return Response.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function processMessage(adapter, normalized) {
  const { threadId, text, attachments, metadata } = normalized;

  // Acknowledge with reaction
  await adapter.acknowledge(metadata);

  // Start typing indicator
  const stopTyping = adapter.startProcessingIndicator(metadata);

  try {
    // Get AI response (non-streaming for Telegram)
    let fullResponse = '';
    const generator = chatStream(threadId, 'telegram-user', text);

    for await (const chunk of generator) {
      if (chunk.type === 'text-delta') {
        fullResponse += chunk.content;
      } else if (chunk.type === 'error') {
        fullResponse = `Error: ${chunk.content}`;
      }
    }

    if (fullResponse) {
      await adapter.sendResponse(threadId, fullResponse, metadata);
    }
  } finally {
    stopTyping();
  }
}
