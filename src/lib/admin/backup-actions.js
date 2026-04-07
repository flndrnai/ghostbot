'use server';

import fs from 'fs';
import path from 'path';
import { auth } from '../auth/config.js';
import { getRawSqlite } from '../db/index.js';
import { PROJECT_ROOT } from '../paths.js';
import { getConfig } from '../config.js';
import { dockerApi } from '../tools/docker.js';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return session;
}

// Tables to include in the JSON export. Secrets are intentionally NOT
// dumped (they're encrypted and the key is not in the export — it'd be
// useless to restore without the AUTH_SECRET anyway).
const EXPORT_TABLES = [
  'users',
  'chats',
  'messages',
  'notifications',
  'code_workspaces',
  'clusters',
  'cluster_roles',
  'settings',
  'knowledge_entries',
  'chat_summaries',
  'token_usage',
  'agent_jobs',
];

export async function getBackupStats() {
  await requireAdmin();
  const sqlite = getRawSqlite();

  const stats = {};
  for (const table of EXPORT_TABLES) {
    try {
      const row = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
      stats[table] = row?.c || 0;
    } catch {
      stats[table] = null; // table doesn't exist
    }
  }

  // DB file size
  let dbSize = 0;
  try {
    const dbPath = process.env.DATABASE_PATH || path.join(PROJECT_ROOT, 'data/db/ghostbot.sqlite');
    if (fs.existsSync(dbPath)) dbSize = fs.statSync(dbPath).size;
  } catch {}

  // Last backup timestamp (if we've kept one)
  return {
    tables: stats,
    dbSize,
    lastBackupAt: null, // could persist this in settings later
  };
}

export async function exportBackup() {
  await requireAdmin();
  const sqlite = getRawSqlite();

  const dump = {
    meta: {
      app: 'GhostBot',
      version: 1,
      exportedAt: new Date().toISOString(),
    },
    config: {
      llmProvider: getConfig('LLM_PROVIDER') || '',
      llmModel: getConfig('LLM_MODEL') || '',
      ollamaBaseUrl: getConfig('OLLAMA_BASE_URL') || '',
      ghOwner: getConfig('GH_OWNER') || '',
      ghRepo: getConfig('GH_REPO') || '',
      systemPrompt: getConfig('SYSTEM_PROMPT') || '',
      maxTokens: getConfig('MAX_TOKENS') || '',
      temperature: getConfig('TEMPERATURE') || '',
    },
    tables: {},
  };

  for (const table of EXPORT_TABLES) {
    try {
      dump.tables[table] = sqlite.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      dump.tables[table] = [];
    }
  }

  // Agent images present on the host
  try {
    const res = await dockerApi('GET', '/images/json?filters={"reference":["ghostbot:coding-agent-*"]}');
    if (res.status === 200 && Array.isArray(res.data)) {
      dump.agentImages = res.data.map((img) => ({
        tags: img.RepoTags || [],
        id: img.Id,
        size: img.Size,
        created: img.Created,
      }));
    } else {
      dump.agentImages = [];
    }
  } catch {
    dump.agentImages = [];
  }

  return dump;
}
