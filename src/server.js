import 'dotenv/config';
import { createServer } from 'http';
import next from 'next';
import { attachCodeProxy } from './lib/code/ws-proxy.js';

const app = next({ dev: false });
const handle = app.getRequestHandler();

// Prevent Next.js from registering its own WebSocket upgrade handler
app.didWebSocketSetup = true;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  attachCodeProxy(server);

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> GhostBot ready on http://localhost:${port}`);
  });
});
