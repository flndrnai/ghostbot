import { auth } from '../../../lib/auth/config.js';
import { chatStream } from '../../../lib/ai/index.js';

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const { chatId: providedChatId, message } = body;

  if (!message?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  const chatId = providedChatId || crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = chatStream(chatId, session.user.id, message.trim());

        for await (const chunk of generator) {
          if (chunk.type === 'text-delta') {
            // AI SDK data stream protocol: text parts
            const data = JSON.stringify({ type: 'text-delta', textDelta: chunk.content });
            controller.enqueue(encoder.encode(`0:${data}\n`));
          } else if (chunk.type === 'error') {
            const data = JSON.stringify({ type: 'error', error: chunk.content });
            controller.enqueue(encoder.encode(`3:${data}\n`));
          }
        }

        // Finish event
        const finish = JSON.stringify({
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 0, completionTokens: 0 },
        });
        controller.enqueue(encoder.encode(`d:${finish}\n`));
      } catch (error) {
        const errData = JSON.stringify({ type: 'error', error: error.message });
        controller.enqueue(encoder.encode(`3:${errData}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Chat-Id': chatId,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
