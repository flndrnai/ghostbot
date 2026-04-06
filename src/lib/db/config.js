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
