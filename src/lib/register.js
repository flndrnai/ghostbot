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
  console.log('GhostBot initialized');
}
