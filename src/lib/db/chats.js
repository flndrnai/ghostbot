import { eq, desc, count, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { chats, messages } from './schema.js';

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

  return { id: messageId };
}

export function updateChatTitle(chatId, title) {
  const db = getDb();
  db.update(chats)
    .set({ title, updatedAt: Date.now() })
    .where(eq(chats.id, chatId))
    .run();
}

export function deleteChat(chatId) {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(messages).where(eq(messages.chatId, chatId)).run();
    tx.delete(chats).where(eq(chats.id, chatId)).run();
  });
}

export function toggleChatStarred(chatId) {
  const db = getDb();
  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
  if (!chat) return;

  db.update(chats)
    .set({ starred: chat.starred ? 0 : 1, updatedAt: Date.now() })
    .where(eq(chats.id, chatId))
    .run();
}
