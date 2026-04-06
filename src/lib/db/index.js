import path from 'path';
import fs from 'fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { PROJECT_ROOT } from '../paths.js';
import * as schema from './schema.js';

let db = null;

export function getDb() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(PROJECT_ROOT, 'data/db/ghostbot.sqlite');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  db = drizzle(sqlite, { schema });
  return db;
}

export function initDatabase() {
  const instance = getDb();
  const migrationsFolder = path.join(PROJECT_ROOT, 'drizzle');

  if (fs.existsSync(migrationsFolder)) {
    migrate(instance, { migrationsFolder });
  }

  return instance;
}

export function resetDb() {
  db = null;
}
