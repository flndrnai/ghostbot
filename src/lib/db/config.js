import { eq, and } from 'drizzle-orm';
import { getDb } from './index.js';
import { settings } from './schema.js';
import { encrypt, decrypt } from './crypto.js';

export function getConfigValue(key) {
  const db = getDb();
  const row = db
    .select()
    .from(settings)
    .where(and(eq(settings.type, 'config'), eq(settings.key, key)))
    .get();
  return row?.value ?? null;
}

export function setConfigValue(key, value, userId = null) {
  const db = getDb();
  const now = Date.now();

  db.delete(settings)
    .where(and(eq(settings.type, 'config'), eq(settings.key, key)))
    .run();

  db.insert(settings)
    .values({
      id: crypto.randomUUID(),
      type: 'config',
      key,
      value,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export function getConfigSecret(key) {
  const db = getDb();
  const row = db
    .select()
    .from(settings)
    .where(and(eq(settings.type, 'config_secret'), eq(settings.key, key)))
    .get();

  if (!row) return null;

  try {
    return decrypt(row.value);
  } catch {
    return null;
  }
}

export function setConfigSecret(key, value, userId = null) {
  // Demo mode: silently no-op on secret writes. We don't want visitor
  // A's API key / PAT persisted and inherited by visitor B. The
  // action reports success to keep the UI happy but nothing lands.
  if (process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1') {
    return;
  }

  const db = getDb();
  const now = Date.now();

  db.delete(settings)
    .where(and(eq(settings.type, 'config_secret'), eq(settings.key, key)))
    .run();

  db.insert(settings)
    .values({
      id: crypto.randomUUID(),
      type: 'config_secret',
      key,
      value: encrypt(value),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export function deleteConfigValue(key) {
  const db = getDb();
  db.delete(settings)
    .where(and(eq(settings.type, 'config'), eq(settings.key, key)))
    .run();
}

export function deleteConfigSecret(key) {
  const db = getDb();
  db.delete(settings)
    .where(and(eq(settings.type, 'config_secret'), eq(settings.key, key)))
    .run();
}

// Custom OpenAI-compatible providers (stored encrypted)
export function getCustomProvider(slug) {
  const db = getDb();
  const row = db
    .select()
    .from(settings)
    .where(and(eq(settings.type, 'llm_provider'), eq(settings.key, slug)))
    .get();

  if (!row) return null;

  try {
    return JSON.parse(decrypt(row.value));
  } catch {
    return null;
  }
}

export function setCustomProvider(slug, config, userId = null) {
  const db = getDb();
  const now = Date.now();

  db.delete(settings)
    .where(and(eq(settings.type, 'llm_provider'), eq(settings.key, slug)))
    .run();

  db.insert(settings)
    .values({
      id: crypto.randomUUID(),
      type: 'llm_provider',
      key: slug,
      value: encrypt(JSON.stringify(config)),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}
