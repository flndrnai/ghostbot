import 'dotenv/config';
import { initDatabase } from './db/index.js';
import { warmConfigCache } from './config.js';

export function registerNodeRuntime() {
  if (!process.env.AUTH_SECRET) {
    console.error('ERROR: AUTH_SECRET is required. Generate one with: openssl rand -base64 32');
    process.exit(1);
  }

  initDatabase();
  warmConfigCache();
  console.log('GhostBot initialized');
}
