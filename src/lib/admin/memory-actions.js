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

export async function listMemory({ limit = 50 } = {}) {
  const session = await requireUser();
  const userId = session.user.id;
  const entries = listKnowledgeEntries({ userId, limit });
  const summaries = listChatSummaries({ userId, limit });
  return {
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
  await requireUser();
  if (kind === 'summary') {
    deleteChatSummary(id);
  } else {
    deleteKnowledgeEntry(id);
  }
  return { success: true };
}

export async function testEmbedding() {
  await requireUser();
  const vec = await embedText('hello world');
  return { success: !!vec, dims: vec?.length || 0 };
}
