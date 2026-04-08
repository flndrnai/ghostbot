import { eq, desc, count, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { chats, messages } from './schema.js';
import { publish } from '../sync/bus.js';

function publishForChat(chatId, event) {
  try {
    const db = getDb();
    const row = db.select({ userId: chats.userId }).from(chats).where(eq(chats.id, chatId)).get();
    if (row?.userId) publish(row.userId, event);
  } catch {
    // Sync is best-effort; never break a write because publishing failed
  }
}

export function createChat(userId, title = 'New Chat', id = null) {
  const db = getDb();
  const now = Date.now();
  const chatId = id || crypto.randomUUID();

  db.insert(chats)
    .values({
      id: chatId,
      userId,
      title,
      chatMode: 'agent',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  publish(userId, { type: 'chat:created', chat: { id: chatId, userId, title, createdAt: now, updatedAt: now } });

  return { id: chatId };
}

export function getChatById(id) {
  const db = getDb();
  return db.select().from(chats).where(eq(chats.id, id)).get();
}

export function getChatsByUserId(userId, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(limit)
    .all();
}

export function getMessagesByChatId(chatId) {
  const db = getDb();
  return db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt)
    .all();
}

export function saveMessage(chatId, role, content, id = null) {
  const db = getDb();
  const now = Date.now();
  const messageId = id || crypto.randomUUID();

  db.transaction((tx) => {
    tx.insert(messages)
      .values({ id: messageId, chatId, role, content, createdAt: now })
      .run();

    tx.update(chats)
      .set({ updatedAt: now })
      .where(eq(chats.id, chatId))
      .run();
  });

  publishForChat(chatId, {
    type: 'message:new',
    chatId,
    message: { id: messageId, chatId, role, content, createdAt: now },
  });

  return { id: messageId };
}

export function updateChatTitle(chatId, title) {
  const db = getDb();
  const now = Date.now();
  db.update(chats)
    .set({ title, updatedAt: now })
    .where(eq(chats.id, chatId))
    .run();
  publishForChat(chatId, { type: 'chat:updated', chatId, fields: { title, updatedAt: now } });
}

export function deleteChat(chatId) {
  const db = getDb();
  // Capture userId before deletion so we can publish to the right user
  const row = db.select({ userId: chats.userId }).from(chats).where(eq(chats.id, chatId)).get();
  db.transaction((tx) => {
    tx.delete(messages).where(eq(messages.chatId, chatId)).run();
    tx.delete(chats).where(eq(chats.id, chatId)).run();
  });
  if (row?.userId) publish(row.userId, { type: 'chat:deleted', chatId });
}

export function toggleChatMemory(chatId) {
  const db = getDb();
  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
  if (!chat) return;

  const now = Date.now();
  const memoryEnabled = chat.memoryEnabled ? 0 : 1;
  db.update(chats)
    .set({ memoryEnabled, updatedAt: now })
    .where(eq(chats.id, chatId))
    .run();
  publish(chat.userId, { type: 'chat:updated', chatId, fields: { memoryEnabled, updatedAt: now } });
  return memoryEnabled;
}

export function toggleChatStarred(chatId) {
  const db = getDb();
  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
  if (!chat) return;

  const now = Date.now();
  const starred = chat.starred ? 0 : 1;
  db.update(chats)
    .set({ starred, updatedAt: now })
    .where(eq(chats.id, chatId))
    .run();
  publish(chat.userId, { type: 'chat:updated', chatId, fields: { starred, updatedAt: now } });
}
