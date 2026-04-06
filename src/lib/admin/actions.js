'use server';

import { auth } from '../auth/config.js';
import { setConfig, getConfig, invalidateConfigCache } from '../config.js';
import { setConfigSecret, getConfigSecret } from '../db/config.js';
import { resetAgent } from '../ai/agent.js';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return session;
}

export async function saveProviderConfig(provider, model) {
  await requireAdmin();
  setConfig('LLM_PROVIDER', provider);
  setConfig('LLM_MODEL', model);
  invalidateConfigCache();
  resetAgent();
  return { success: true };
}

export async function saveApiKey(keyName, value) {
  await requireAdmin();
  setConfigSecret(keyName, value);
  invalidateConfigCache(keyName);
  resetAgent();
  return { success: true };
}

export async function getApiKeyStatus(keyName) {
  await requireAdmin();
  const value = getConfigSecret(keyName);
  return { configured: !!value };
}

export async function testLLMConnection() {
  await requireAdmin();
  try {
    const { createModel } = await import('../ai/model.js');
    const model = await createModel({ maxTokens: 50 });
    const response = await model.invoke([{ role: 'user', content: 'Say "hello" in one word.' }]);
    const text = typeof response.content === 'string' ? response.content : 'OK';
    return { success: true, response: text.slice(0, 200) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveOllamaUrl(url) {
  await requireAdmin();
  setConfig('OLLAMA_BASE_URL', url);
  invalidateConfigCache();
  resetAgent();
  return { success: true };
}

export async function testOllamaConnection(url) {
  await requireAdmin();
  try {
    const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const models = (data.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size || '',
      quantization: m.details?.quantization_level || '',
    }));
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveChatSettings({ systemPrompt, maxTokens, temperature }) {
  await requireAdmin();
  if (systemPrompt !== undefined) setConfig('SYSTEM_PROMPT', systemPrompt);
  if (maxTokens !== undefined) setConfig('MAX_TOKENS', String(maxTokens));
  if (temperature !== undefined) setConfig('TEMPERATURE', String(temperature));
  invalidateConfigCache();
  return { success: true };
}

export async function getSettings() {
  await requireAdmin();
  return {
    provider: getConfig('LLM_PROVIDER') || 'ollama',
    model: getConfig('LLM_MODEL') || '',
    ollamaUrl: getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434',
    systemPrompt: getConfig('SYSTEM_PROMPT') || '',
    maxTokens: getConfig('MAX_TOKENS') || '4096',
    temperature: getConfig('TEMPERATURE') || '0.7',
  };
}
