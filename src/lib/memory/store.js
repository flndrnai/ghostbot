// Knowledge store — thin wrapper around the knowledge_entries and
// chat_summaries tables, plus in-JS cosine search over the stored
// embeddings. Fine for up to ~10k entries; swap for sqlite-vec or
// ChromaDB later if volume grows.

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { knowledgeEntries, chatSummaries } from '../db/schema.js';
import {
  embedText,
  cosineSimilarity,
  serializeVector,
  deserializeVector,
  getEmbeddingModel,
} from './embeddings.js';

// ------------------------------------------------------------
// Knowledge entries (chunks, manual notes, code snippets, etc.)
// ------------------------------------------------------------

export async function saveKnowledgeEntry({
  userId,
  sourceType,
  sourceId = null,
  title,
  content,
  metadata = null,
}) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const embedding = await embedText(`${title}\n\n${content}`);
  const embeddingModel = embedding ? getEmbeddingModel() : null;

  db.insert(knowledgeEntries)
    .values({
      id,
      userId: userId || null,
      sourceType,
      sourceId,
      title,
      content,
      embedding: serializeVector(embedding),
      embeddingModel,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
    })
    .run();

  return { id, hasEmbedding: !!embedding };
}

export function deleteKnowledgeEntry(id, userId) {
  const db = getDb();
  // Ownership enforced at the DB layer when userId is supplied: rows
  // are deleted only if both id AND user_id match. Foreign entries
  // survive. Callers in server actions MUST pass userId.
  const where = userId
    ? and(eq(knowledgeEntries.id, id), eq(knowledgeEntries.userId, userId))
    : eq(knowledgeEntries.id, id);
  db.delete(knowledgeEntries).where(where).run();
}

export function listKnowledgeEntries({ userId = null, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  let query = db.select().from(knowledgeEntries);
  if (userId) query = query.where(eq(knowledgeEntries.userId, userId));
  return query.orderBy(desc(knowledgeEntries.createdAt)).limit(limit).offset(offset).all();
}

/**
 * Semantic search over knowledge_entries using cosine similarity.
 * Returns the top K entries with scores, filtered by optional userId.
 */
export async function searchKnowledge(query, { userId = null, topK = 5, minScore = 0.3 } = {}) {
  if (!query || typeof query !== 'string') return [];
  const queryVec = await embedText(query);
  if (!queryVec) return [];

  const db = getDb();
  let rows = db.select().from(knowledgeEntries);
  if (userId) rows = rows.where(eq(knowledgeEntries.userId, userId));
  const entries = rows.all();

  const scored = [];
  for (const e of entries) {
    const vec = deserializeVector(e.embedding);
    if (!vec) continue;
    const score = cosineSimilarity(queryVec, vec);
    if (score >= minScore) scored.push({ ...e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ------------------------------------------------------------
// Chat summaries (2-3 sentence recap of each completed chat)
// ------------------------------------------------------------

export async function saveChatSummary({ chatId, userId, summary, keyTopics = [] }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const embedding = await embedText(`${summary}\n\nTopics: ${keyTopics.join(', ')}`);
  const embeddingModel = embedding ? getEmbeddingModel() : null;

  // Upsert: if a summary for this chat already exists, replace it
  const existing = db.select().from(chatSummaries).where(eq(chatSummaries.chatId, chatId)).get();
  if (existing) {
    db.update(chatSummaries)
      .set({
        summary,
        keyTopics: JSON.stringify(keyTopics),
        embedding: serializeVector(embedding),
        embeddingModel,
        createdAt: now,
      })
      .where(eq(chatSummaries.id, existing.id))
      .run();
    return { id: existing.id, updated: true };
  }

  db.insert(chatSummaries)
    .values({
      id,
      chatId,
      userId: userId || null,
      summary,
      keyTopics: JSON.stringify(keyTopics),
      embedding: serializeVector(embedding),
      embeddingModel,
      createdAt: now,
    })
    .run();
  return { id, updated: false };
}

export function listChatSummaries({ userId = null, limit = 100 } = {}) {
  const db = getDb();
  let query = db.select().from(chatSummaries);
  if (userId) query = query.where(eq(chatSummaries.userId, userId));
  return query.orderBy(desc(chatSummaries.createdAt)).limit(limit).all();
}

export function getChatSummary(chatId) {
  const db = getDb();
  return db.select().from(chatSummaries).where(eq(chatSummaries.chatId, chatId)).get();
}

export function deleteChatSummary(id, userId) {
  const db = getDb();
  const where = userId
    ? and(eq(chatSummaries.id, id), eq(chatSummaries.userId, userId))
    : eq(chatSummaries.id, id);
  db.delete(chatSummaries).where(where).run();
}

/**
 * Semantic search over chat summaries. Used to inject relevant
 * context when a new chat starts.
 */
export async function searchChatSummaries(query, { userId = null, topK = 3, minScore = 0.4 } = {}) {
  if (!query || typeof query !== 'string') return [];
  const queryVec = await embedText(query);
  if (!queryVec) return [];

  const db = getDb();
  let rows = db.select().from(chatSummaries);
  if (userId) rows = rows.where(eq(chatSummaries.userId, userId));
  const summaries = rows.all();

  const scored = [];
  for (const s of summaries) {
    const vec = deserializeVector(s.embedding);
    if (!vec) continue;
    const score = cosineSimilarity(queryVec, vec);
    if (score >= minScore) scored.push({ ...s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
