import { auth } from '../../../lib/auth/config.js';
import { subscribe } from '../../../lib/sync/bus.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Initial hello so the client knows the connection is live
      send({ type: 'connected' });

      // Subscribe to bus events for this user
      const unsubscribe = subscribe(userId, send);

      // Heartbeat every 25s to keep proxies (Traefik / Cloudflare) from killing the connection
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          closed = true;
          cleanup();
        }
      }, 25000);

      function cleanup() {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch {}
      }

      // Stash for the cancel handler below
      controller.__cleanup = cleanup;
    },
    cancel() {
      if (typeof this.__cleanup === 'function') this.__cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
