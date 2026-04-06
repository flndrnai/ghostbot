import { listContainers, tailContainerLogs, DockerFrameParser } from '../tools/docker.js';
import { clusterShortId } from '../db/clusters.js';
import { mapLine, mapClaudeCodeLine } from '../ai/line-mappers.js';

/**
 * SSE stream handler for cluster container logs + status.
 */
export function createClusterLogStream(cluster) {
  const cid = clusterShortId(cluster);
  const prefix = `cluster-${cid}-`;
  const encoder = new TextEncoder();
  let closed = false;

  return new ReadableStream({
    async start(controller) {
      const send = (event, data) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Poll container status every 3s
      const statusInterval = setInterval(async () => {
        if (closed) return;
        try {
          const containers = await listContainers(prefix);
          const roles = {};
          for (const c of containers) {
            const name = (c.Names?.[0] || '').replace(/^\//, '');
            // Extract role ID from container name: cluster-{cid}-role-{rid}-{uuid}
            const parts = name.split('-');
            const roleIdx = parts.indexOf('role');
            const roleId = roleIdx >= 0 ? parts[roleIdx + 1] : 'unknown';

            if (!roles[roleId]) roles[roleId] = { containers: [] };
            roles[roleId].containers.push({
              name,
              state: c.State,
              status: c.Status,
            });
          }
          send('status', { roles });
        } catch {}
      }, 3000);

      // Keepalive
      const pingInterval = setInterval(() => {
        if (!closed) send('ping', { time: Date.now() });
      }, 15000);

      // Cleanup
      const cleanup = () => {
        closed = true;
        clearInterval(statusInterval);
        clearInterval(pingInterval);
      };

      // Send initial status immediately
      try {
        const containers = await listContainers(prefix);
        send('status', { roles: {}, containers: containers.length });
      } catch {}

      // Controller abort handler
      controller.close = new Proxy(controller.close, {
        apply(target, thisArg, args) {
          cleanup();
          return Reflect.apply(target, thisArg, args);
        },
      });
    },
  });
}
