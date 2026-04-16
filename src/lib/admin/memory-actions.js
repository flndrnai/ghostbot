'use server';

import { auth } from '../auth/config.js';
import {
  listKnowledgeEntries,
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
  searchKnowledge,
  listChatSummaries,
  deleteChatSummary,
  searchChatSummaries,
} from '../memory/store.js';
import { embedText } from '../memory/embeddings.js';

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function listMemory({ limit = 50, offset = 0, sourceType = null } = {}) {
  const session = await requireUser();
  const userId = session.user.id;
  let entries = listKnowledgeEntries({ userId, limit: 500, offset: 0 });
  if (sourceType) entries = entries.filter((e) => e.sourceType === sourceType);
  const totalEntries = entries.length;
  entries = entries.slice(offset, offset + limit);

  const summaries = listChatSummaries({ userId, limit });
  const totalSummaries = listChatSummaries({ userId, limit: 10000 }).length;

  return {
    stats: {
      totalEntries,
      totalSummaries,
      embeddedEntries: entries.filter((e) => !!e.embedding).length,
      embeddedSummaries: summaries.filter((s) => !!s.embedding).length,
      sourceTypes: Array.from(new Set(entries.map((e) => e.sourceType))),
    },
    entries: entries.map((e) => ({
      id: e.id,
      sourceType: e.sourceType,
      title: e.title,
      content: e.content,
      hasEmbedding: !!e.embedding,
      createdAt: e.createdAt,
    })),
    summaries: summaries.map((s) => {
      let topics = [];
      try { topics = JSON.parse(s.keyTopics || '[]'); } catch {}
      return {
        id: s.id,
        chatId: s.chatId,
        summary: s.summary,
        topics,
        hasEmbedding: !!s.embedding,
        createdAt: s.createdAt,
      };
    }),
  };
}

export async function exportMemory() {
  const session = await requireUser();
  const userId = session.user.id;
  const entries = listKnowledgeEntries({ userId, limit: 10000 });
  const summaries = listChatSummaries({ userId, limit: 10000 });
  return {
    exportedAt: new Date().toISOString(),
    userId,
    entries: entries.map((e) => ({
      id: e.id,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      title: e.title,
      content: e.content,
      createdAt: e.createdAt,
    })),
    summaries: summaries.map((s) => {
      let topics = [];
      try { topics = JSON.parse(s.keyTopics || '[]'); } catch {}
      return {
        id: s.id,
        chatId: s.chatId,
        summary: s.summary,
        topics,
        createdAt: s.createdAt,
      };
    }),
  };
}

export async function searchMemory(query) {
  const session = await requireUser();
  const userId = session.user.id;
  if (!query || !query.trim()) return { entries: [], summaries: [] };

  const [entries, summaries] = await Promise.all([
    searchKnowledge(query.trim(), { userId, topK: 10 }),
    searchChatSummaries(query.trim(), { userId, topK: 10, minScore: 0.3 }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      sourceType: e.sourceType,
      title: e.title,
      content: e.content,
      score: Number(e.score.toFixed(3)),
      createdAt: e.createdAt,
    })),
    summaries: summaries.map((s) => {
      let topics = [];
      try { topics = JSON.parse(s.keyTopics || '[]'); } catch {}
      return {
        id: s.id,
        chatId: s.chatId,
        summary: s.summary,
        topics,
        score: Number(s.score.toFixed(3)),
        createdAt: s.createdAt,
      };
    }),
  };
}

export async function addManualEntry({ title, content }) {
  const session = await requireUser();
  if (!title?.trim() || !content?.trim()) {
    return { success: false, error: 'Title and content required' };
  }
  const result = await saveKnowledgeEntry({
    userId: session.user.id,
    sourceType: 'manual',
    title: title.trim(),
    content: content.trim(),
  });
  return { success: true, ...result };
}

export async function removeMemoryEntry(id, kind = 'entry') {
  const session = await requireUser();
  // Ownership enforced in the DB layer via `id = ? AND user_id = ?`.
  if (kind === 'summary') {
    deleteChatSummary(id, session.user.id);
  } else {
    deleteKnowledgeEntry(id, session.user.id);
  }
  return { success: true };
}

export async function testEmbedding() {
  await requireUser();
  const vec = await embedText('hello world');
  return { success: !!vec, dims: vec?.length || 0 };
}
