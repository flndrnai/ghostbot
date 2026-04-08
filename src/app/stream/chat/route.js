import { auth } from '../../../lib/auth/config.js';
import { chatStream } from '../../../lib/ai/index.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

// Global registry of in-flight generators keyed by chatId so the
// server-side stream keeps running to completion even when the
// browser navigates away. The completed message lands in the DB
// and is re-hydrated + live-synced via the SSE bus the next time
// the client views the chat. Survives Next.js HMR via globalThis.
if (!globalThis.__ghostbotLiveChats) {
  globalThis.__ghostbotLiveChats = new Set();
}
const liveChats = globalThis.__ghostbotLiveChats;

export async function POST(request) {
  // 30 chat messages per minute per IP
  const limited = enforceRateLimit(request, 'chat:stream', { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const { messages, chatId: providedChatId } = body;

  // Extract the last user message from the array
  const lastUserMessage = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const userText = lastUserMessage?.content || body.message || '';

  if (!userText.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  const chatId = providedChatId || crypto.randomUUID();

  // Guard against duplicate concurrent requests for the same chat.
  // If one is already running, reject the second — the client would
  // otherwise double-stream the same message.
  if (liveChats.has(chatId)) {
    return Response.json(
      { error: 'A response is already streaming for this chat. Please wait for it to finish.' },
      { status: 409 },
    );
  }
  liveChats.add(chatId);

  const encoder = new TextEncoder();
  const userId = session.user.id;

  // Run the generator in the background. It pushes into two places:
  //   1. A buffer used by the active client connection (if any)
  //   2. The sync bus (via saveMessage → publishForChat → SSE broadcast)
  //      and the database (via chatStream's saveMessage call at the end).
  //
  // If the client disconnects mid-stream, the background task
  // keeps consuming the generator to completion so the assistant
  // message always ends up saved to the DB. When the client
  // reconnects or navigates back to the chat, the page loads the
  // complete message from the DB and subsequent delta events via
  // the SSE sync bus also populate in real time.
  let clientClosed = false;
  let pendingResolve = null;
  const pending = [];

  function pushToClient(frame) {
    if (clientClosed) return;
    pending.push(frame);
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = null;
      r();
    }
  }

  // Run generator to completion regardless of client state
  (async () => {
    try {
      const generator = chatStream(chatId, userId, userText.trim(), messages);
      for await (const chunk of generator) {
        if (chunk.type === 'text-delta') {
          pushToClient(encoder.encode(`0:"${escapeStreamText(chunk.content)}"\n`));
        } else if (chunk.type === 'error') {
          pushToClient(encoder.encode(`3:"${escapeStreamText(chunk.content)}"\n`));
        }
      }
      pushToClient(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
    } catch (error) {
      console.error('[stream/chat] generator crashed:', error?.message);
      pushToClient(encoder.encode(`3:"${escapeStreamText(error?.message || 'Generation failed')}"\n`));
    } finally {
      liveChats.delete(chatId);
      // Wake the reader so it can close the stream
      if (pendingResolve) {
        const r = pendingResolve;
        pendingResolve = null;
        r();
      }
    }
  })().catch((err) => console.error('[stream/chat] background task error:', err));

  // Client-facing readable stream. Drains `pending` and waits on
  // `pendingResolve` when empty. The cancel handler flips
  // clientClosed so future pushToClient calls are ignored — but the
  // background generator continues running to the DB.
  const stream = new ReadableStream({
    async pull(controller) {
      while (pending.length === 0) {
        if (!liveChats.has(chatId) && pending.length === 0) {
          // Generator finished AND buffer is drained
          controller.close();
          return;
        }
        await new Promise((resolve) => { pendingResolve = resolve; });
      }
      const frame = pending.shift();
      try {
        controller.enqueue(frame);
      } catch {
        // Client gone; background task keeps running
        clientClosed = true;
      }
    },
    cancel() {
      clientClosed = true;
      if (pendingResolve) {
        const r = pendingResolve;
        pendingResolve = null;
        r();
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
