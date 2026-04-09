// Persistent Memory — AIOS-style tiered memory for GhostBot
//
// Tier 1: MEMORY.md per user — always-loaded curated facts (~200 lines max)
// Tier 2: Daily session logs — append-only per-day files
// Tier 3: Vector memory — already exists (embeddings + cosine search in store.js)
//
// Files stored at: data/memory/<userId>/MEMORY.md
//                  data/memory/<userId>/logs/YYYY-MM-DD.md

import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../paths.js';

function memoryDir(userId) {
  return path.join(PROJECT_ROOT, 'data', 'memory', userId);
}

function memoryFilePath(userId) {
  return path.join(memoryDir(userId), 'MEMORY.md');
}

function logsDir(userId) {
  return path.join(memoryDir(userId), 'logs');
}

function todayLogPath(userId) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logsDir(userId), `${date}.md`);
}

function yesterdayLogPath(userId) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const date = d.toISOString().split('T')[0];
  return path.join(logsDir(userId), `${date}.md`);
}

// ─── Tier 1: MEMORY.md ──────────────────────────────────────

const MEMORY_TEMPLATE = `# Persistent Memory

> Curated long-term facts, preferences, and context. GhostBot reads this at the start of every chat.

## User Preferences

- (will be populated as you chat)

## Business / Project Facts

- (will be populated as you chat)

## Current Goals

- (will be populated as you chat)

## Learned Behaviors

- (will be populated as GhostBot learns your patterns)

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
`;

export function getMemory(userId) {
  const filePath = memoryFilePath(userId);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {}
  return null;
}

export function getOrCreateMemory(userId) {
  const existing = getMemory(userId);
  if (existing) return existing;

  const dir = memoryDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(logsDir(userId), { recursive: true });
  fs.writeFileSync(memoryFilePath(userId), MEMORY_TEMPLATE, 'utf-8');
  return MEMORY_TEMPLATE;
}

export function updateMemory(userId, content) {
  const dir = memoryDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(memoryFilePath(userId), content, 'utf-8');
}

// ─── Tier 2: Daily session logs ─────────────────────────────

function createDailyLog(userId) {
  const logPath = todayLogPath(userId);
  if (fs.existsSync(logPath)) return;

  const dir = logsDir(userId);
  fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const template = `# Daily Log: ${now.toISOString().split('T')[0]}\n\n> Session log for ${day}\n\n---\n\n## Events & Notes\n\n`;
  fs.writeFileSync(logPath, template, 'utf-8');
}

export function appendToLog(userId, entry) {
  createDailyLog(userId);
  const logPath = todayLogPath(userId);
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  fs.appendFileSync(logPath, `- **${timestamp}** — ${entry}\n`, 'utf-8');
}

export function getTodayLog(userId) {
  createDailyLog(userId);
  try {
    return fs.readFileSync(todayLogPath(userId), 'utf-8');
  } catch {
    return null;
  }
}

export function getYesterdayLog(userId) {
  try {
    const logPath = yesterdayLogPath(userId);
    if (fs.existsSync(logPath)) {
      return fs.readFileSync(logPath, 'utf-8');
    }
  } catch {}
  return null;
}

/**
 * Get the combined context for injection into the system prompt.
 * Returns MEMORY.md + today's log (truncated to fit).
 */
export function getMemoryContext(userId) {
  const memory = getOrCreateMemory(userId);
  const todayLog = getTodayLog(userId);

  let context = '';

  // Tier 1: persistent memory (cap at 4KB)
  if (memory) {
    context += memory.slice(0, 4000);
  }

  // Tier 2: today's log (cap at 2KB)
  if (todayLog && todayLog.length > 50) {
    context += '\n\n' + todayLog.slice(0, 2000);
  }

  return context;
}
