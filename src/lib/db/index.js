import path from 'path';
import fs from 'fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { PROJECT_ROOT } from '../paths.js';
import * as schema from './schema.js';

let db = null;
let rawSqlite = null;

export function getDb() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(PROJECT_ROOT, 'data/db/ghostbot.sqlite');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  rawSqlite = sqlite;

  db = drizzle(sqlite, { schema });

  // Auto-migrate: add columns and tables that schema.js defines but the on-disk
  // DB is missing. Runs every startup; no-op if everything is already in place.
  runAutoMigrations(sqlite);

  return db;
}

export function getRawSqlite() {
  if (!rawSqlite) getDb();
  return rawSqlite;
}

// ------------------------------------------------------------
// Runtime auto-migrations
// ------------------------------------------------------------
// Adds columns + tables that live in schema.js but haven't made
// their way into the drizzle migration files yet. Safer than
// fighting migration generation in production.

function runAutoMigrations(sqlite) {
  try {
    // agent_jobs table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS agent_jobs (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        user_id TEXT NOT NULL,
        agent TEXT NOT NULL,
        image TEXT NOT NULL,
        prompt TEXT NOT NULL,
        repo TEXT NOT NULL,
        base_branch TEXT NOT NULL,
        branch TEXT NOT NULL,
        status TEXT NOT NULL,
        output TEXT,
        error TEXT,
        pr_url TEXT,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      );
    `);

    addColumnIfMissing(sqlite, 'knowledge_entries', 'user_id', 'TEXT');
    addColumnIfMissing(sqlite, 'knowledge_entries', 'embedding', 'TEXT');
    addColumnIfMissing(sqlite, 'knowledge_entries', 'embedding_model', 'TEXT');

    addColumnIfMissing(sqlite, 'chat_summaries', 'user_id', 'TEXT');
    addColumnIfMissing(sqlite, 'chat_summaries', 'embedding', 'TEXT');
    addColumnIfMissing(sqlite, 'chat_summaries', 'embedding_model', 'TEXT');

    // Per-chat memory opt-out. 1 = participate in the memory/RAG system
    // (default), 0 = don't embed or summarize this chat at all.
    addColumnIfMissing(sqlite, 'chats', 'memory_enabled', 'INTEGER NOT NULL DEFAULT 1');

    // Multi-user: invitations table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        invited_by TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        accepted_at INTEGER,
        created_at INTEGER NOT NULL
      );
    `);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);`);

    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_agent_jobs_user ON agent_jobs(user_id);`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_agent_jobs_chat ON agent_jobs(chat_id);`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_entries(user_id);`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_chat_summaries_user ON chat_summaries(user_id);`);
  } catch (err) {
    console.error('[db] auto-migration failed:', err.message);
  }
}

function addColumnIfMissing(sqlite, table, column, type) {
  try {
    const rows = sqlite.prepare(`PRAGMA table_info(${table});`).all();
    if (!rows.length) return; // table doesn't exist yet, drizzle will create it
    if (rows.some((r) => r.name === column)) return;
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch (err) {
    console.error(`[db] failed to add ${table}.${column}:`, err.message);
  }
}

export function initDatabase() {
  const instance = getDb();
  const migrationsFolder = path.join(PROJECT_ROOT, 'drizzle');

  if (fs.existsSync(migrationsFolder)) {
    try {
      migrate(instance, { migrationsFolder });
    } catch (err) {
      console.error('[db] drizzle migrate failed (continuing with auto-migrate):', err.message);
    }
  }

  return instance;
}

export function resetDb() {
  db = null;
  rawSqlite = null;
}
