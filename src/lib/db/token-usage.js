import { eq, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { tokenUsage } from './schema.js';

export function recordTokenUsage({ chatId, messageId, provider, model, promptTokens, completionTokens }) {
  const db = getDb();
  const totalTokens = (promptTokens || 0) + (completionTokens || 0);

  db.insert(tokenUsage)
    .values({
      id: crypto.randomUUID(),
      chatId,
      messageId: messageId || null,
      provider,
      model,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens,
      createdAt: Date.now(),
    })
    .run();
}

export function getTokenUsageByChatId(chatId) {
  const db = getDb();
  const result = db
    .select({
      promptTokens: sql`SUM(${tokenUsage.promptTokens})`,
      completionTokens: sql`SUM(${tokenUsage.completionTokens})`,
      totalTokens: sql`SUM(${tokenUsage.totalTokens})`,
      count: sql`COUNT(*)`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.chatId, chatId))
    .get();

  return result;
}
