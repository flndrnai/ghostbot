import { auth } from '../../../lib/auth/config.js';
import { chatStream } from '../../../lib/ai/index.js';

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const { messages, chatId: providedChatId } = body;

  // Extract the last user message from AI SDK's messages array
  const lastUserMessage = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const userText = lastUserMessage?.content || body.message || '';

  if (!userText.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  const chatId = providedChatId || crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = chatStream(chatId, session.user.id, userText.trim());

        // AI SDK data stream protocol v2
        // Format: "{prefix}:{JSON}\n"
        // 0: text delta
        // 2: data (message annotations)
        // 8: message annotation
        // d: finish
        // 3: error

        for await (const chunk of generator) {
          if (chunk.type === 'text-delta') {
            controller.enqueue(encoder.encode(`0:"${escapeStreamText(chunk.content)}"\n`));
          } else if (chunk.type === 'error') {
            controller.enqueue(encoder.encode(`3:"${escapeStreamText(chunk.content)}"\n`));
          }
        }

        // Finish
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
      } catch (error) {
        controller.enqueue(encoder.encode(`3:"${escapeStreamText(error.message)}"\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Chat-Id': chatId,
      'X-Vercel-AI-Data-Stream': 'v1',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function escapeStreamText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
