import { getConfigValue, setConfigValue, getConfigSecret, setConfigSecret } from './db/config.js';

const DEFAULTS = {
  LLM_PROVIDER: 'ollama',
  LLM_MODEL: '',
  OLLAMA_BASE_URL: 'http://localhost:11434',
  SYSTEM_PROMPT: 'You are GhostBot, a helpful AI coding assistant. Be concise, clear, and provide working code when asked.',
  MAX_TOKENS: '4096',
  TEMPERATURE: '0.7',
  CODING_AGENT: 'claude-code',
};

const SECRET_KEYS = new Set([
  'LLM_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
]);

// Cache survives Next.js HMR/webpack chunking
if (!globalThis.__ghostbotConfigCache) {
  globalThis.__ghostbotConfigCache = new Map();
}
const cache = globalThis.__ghostbotConfigCache;

export function getConfig(key) {
  if (cache.has(key)) return cache.get(key);

  let value = null;

  if (SECRET_KEYS.has(key)) {
    value = getConfigSecret(key);
  } else {
    value = getConfigValue(key);
  }

  // Env fallback
  if (value === null && process.env[key]) {
    value = process.env[key];
  }

  // Default fallback
  if (value === null && key in DEFAULTS) {
    value = DEFAULTS[key];
  }

  if (value !== null) {
    cache.set(key, value);
  }

  return value;
}

export function setConfig(key, value, userId = null) {
  if (SECRET_KEYS.has(key)) {
    setConfigSecret(key, value, userId);
  } else {
    setConfigValue(key, value, userId);
  }
  cache.set(key, value);
}

export function invalidateConfigCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function warmConfigCache() {
  for (const key of Object.keys(DEFAULTS)) {
    getConfig(key);
  }
}
