import { WebSocketServer, WebSocket } from 'ws';
import { decode } from 'next-auth/jwt';
import { getCodeWorkspaceById } from '../db/code-workspaces.js';
import { getSession } from './terminal-sessions.js';

const AUTH_SECRET = () => process.env.AUTH_SECRET;

export function attachCodeProxy(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const url = req.url || '';

    // Match /code/{workspaceId}/ws or /code/{workspaceId}/term/{sessionId}/ws
    const primaryMatch = url.match(/^\/code\/([^/]+)\/ws$/);
    const termMatch = url.match(/^\/code\/([^/]+)\/term\/([^/]+)\/ws$/);

    if (!primaryMatch && !termMatch) return;

    const workspaceId = primaryMatch?.[1] || termMatch?.[1];
    const sessionId = termMatch?.[2] || null;

    // Authenticate via session cookie
    const user = await authenticateRequest(req);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify workspace ownership
    const workspace = getCodeWorkspaceById(workspaceId);
    if (!workspace || workspace.userId !== user.sub) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // Determine target port
    let targetPort = 7681; // Primary tab
    if (sessionId) {
      const session = getSession(workspaceId, sessionId);
      if (!session) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }
      targetPort = session.port;
    }

    // Proxy to container's ttyd WebSocket
    const containerName = workspace.containerName;
    const targetUrl = `ws://${containerName}:${targetPort}/ws`;

    wss.handleUpgrade(req, socket, head, (clientWs) => {
      const containerWs = new WebSocket(targetUrl);

      containerWs.on('open', () => {
        // Bidirectional pipe
        clientWs.on('message', (data) => {
          if (containerWs.readyState === WebSocket.OPEN) containerWs.send(data);
        });
        containerWs.on('message', (data) => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
        });
      });

      clientWs.on('close', () => containerWs.close());
      containerWs.on('close', () => clientWs.close());
      containerWs.on('error', () => clientWs.close());
      clientWs.on('error', () => containerWs.close());
    });
  });
}

async function authenticateRequest(req) {
  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => c.trim().split('=').map(decodeURIComponent)),
    );

    const token = cookies['authjs.session-token'] || cookies['__Secure-authjs.session-token'];
    if (!token) return null;

    const decoded = await decode({ token, secret: AUTH_SECRET() });
    return decoded;
  } catch {
    return null;
  }
}
