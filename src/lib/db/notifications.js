import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { notifications, subscriptions } from './schema.js';

export function createNotification(text, payload = {}) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();

  db.insert(notifications)
    .values({
      id,
      notification: text,
      payload: JSON.stringify(payload),
      read: 0,
      createdAt: now,
    })
    .run();

  // Fire-and-forget distribution to subscribers
  distributeNotification(text).catch((err) => {
    console.error('[notifications] distribution failed:', err.message);
  });

  return { id };
}

export function getNotifications(limit = 25, offset = 0) {
  const db = getDb();
  return db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getUnreadCount() {
  const db = getDb();
  const result = db
    .select({ count: sql`COUNT(*)` })
    .from(notifications)
    .where(eq(notifications.read, 0))
    .get();
  return result?.count ?? 0;
}

export function markAllRead() {
  const db = getDb();
  db.update(notifications).set({ read: 1 }).where(eq(notifications.read, 0)).run();
}

export function markRead(id) {
  const db = getDb();
  db.update(notifications).set({ read: 1 }).where(eq(notifications.id, id)).run();
}

async function distributeNotification(text) {
  const db = getDb();
  const subs = db.select().from(subscriptions).all();

  for (const sub of subs) {
    try {
      if (sub.platform === 'telegram') {
        const { getConfig } = await import('../config.js');
        const botToken = getConfig('TELEGRAM_BOT_TOKEN');
        if (botToken) {
          const { sendMessage } = await import('../tools/telegram.js');
          await sendMessage(botToken, sub.channelId, text);
        }
      }
    } catch (err) {
      console.error(`[notifications] failed to send to ${sub.platform}/${sub.channelId}:`, err.message);
    }
  }
}
