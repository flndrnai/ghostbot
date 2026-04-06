import 'dotenv/config';
import { initDatabase } from './db/index.js';
import { warmConfigCache } from './config.js';
import { loadCrons } from './cron.js';
import { loadTriggers } from './triggers.js';

export function registerNodeRuntime() {
  if (!process.env.AUTH_SECRET) {
    console.error('ERROR: AUTH_SECRET is required. Generate one with: openssl rand -base64 32');
    process.exit(1);
  }

  initDatabase();
  warmConfigCache();
  loadTriggers();
  loadCrons();

  // Lazy import to avoid pulling Docker client at startup
  import('./cluster/runtime.js')
    .then((m) => m.startClusterRuntime())
    .catch((err) => console.log('[cluster-runtime] skipped:', err.message));

  console.log('GhostBot initialized');
}
