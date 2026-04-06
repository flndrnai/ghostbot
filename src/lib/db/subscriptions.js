import { eq, and } from 'drizzle-orm';
import { getDb } from './index.js';
import { subscriptions } from './schema.js';

export function addSubscription(platform, channelId) {
  const db = getDb();

  // Check for existing
  const existing = db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.platform, platform), eq(subscriptions.channelId, channelId)))
    .get();

  if (existing) return existing;

  const id = crypto.randomUUID();
  db.insert(subscriptions)
    .values({ id, platform, channelId, createdAt: Date.now() })
    .run();

  return { id, platform, channelId };
}

export function getSubscriptions(platform = null) {
  const db = getDb();
  if (platform) {
    return db.select().from(subscriptions).where(eq(subscriptions.platform, platform)).all();
  }
  return db.select().from(subscriptions).all();
}

export function removeSubscription(id) {
  const db = getDb();
  db.delete(subscriptions).where(eq(subscriptions.id, id)).run();
}
