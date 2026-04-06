import 'dotenv/config';
import { createServer } from 'http';
import next from 'next';

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // WebSocket proxy will be attached here in Phase 3

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> GhostBot ready on http://localhost:${port}`);
  });
});
