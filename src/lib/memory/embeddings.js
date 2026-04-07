// Embedding generation via Ollama's /api/embed endpoint.
//
// Default model: nomic-embed-text (768 dims, ~274 MB, very fast).
// Pull with: ollama pull nomic-embed-text
//
// Falls back to null if Ollama is unreachable — callers should
// treat embedding-less entries as still retrievable by text search.

import { getConfig } from '../config.js';

const DEFAULT_MODEL = 'nomic-embed-text';

export function getEmbeddingModel() {
  return getConfig('EMBEDDING_MODEL') || DEFAULT_MODEL;
}

export function getEmbeddingBaseUrl() {
  return (getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434').replace(/\/+$/, '');
}

/**
 * Embed a single text. Returns a Float32 array or null on failure.
 */
export async function embedText(text, { signal } = {}) {
  if (!text || typeof text !== 'string') return null;
  const baseUrl = getEmbeddingBaseUrl();
  const model = getEmbeddingModel();

  try {
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text, keep_alive: '30m' }),
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Ollama returns { embeddings: [[...]] } (new) or { embedding: [...] } (old)
    const vec = Array.isArray(data?.embeddings?.[0]) ? data.embeddings[0] : data?.embedding;
    if (!Array.isArray(vec) || !vec.length) return null;
    return vec;
  } catch {
    return null;
  }
}

/**
 * Cosine similarity between two vectors of the same length.
 * Returns a number in [-1, 1], higher is more similar.
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Serialize/deserialize a vector for DB storage. We store as JSON
 * because sqlite TEXT handles it fine and the vectors are small.
 */
export function serializeVector(vec) {
  if (!Array.isArray(vec)) return null;
  return JSON.stringify(vec);
}

export function deserializeVector(str) {
  if (!str) return null;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
