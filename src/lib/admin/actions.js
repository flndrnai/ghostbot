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

export async function removeApiKey(keyName) {
  await requireAdmin();
  const { deleteConfigSecret } = await import('../db/config.js');
  deleteConfigSecret(keyName);
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
    const { HumanMessage } = await import('@langchain/core/messages');
    const model = await createModel({ maxTokens: 50 });
    const response = await model.invoke([new HumanMessage('Say "hello" in one word.')]);
    const text = typeof response.content === 'string' ? response.content : 'OK';
    return { success: true, response: text.slice(0, 200) };
  } catch (error) {
    let msg = error.message || 'Unknown error';
    if (error.cause) msg += ` (${error.cause.message || error.cause})`;
    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
      msg = 'Cannot connect to LLM API. Check your network connection and API key.';
    }
    return { success: false, error: msg };
  }
}

export async function saveOllamaUrl(url) {
  await requireAdmin();
  // Strip trailing slashes to prevent double-slash issues
  const cleanUrl = (url || '').replace(/\/+$/, '');
  setConfig('OLLAMA_BASE_URL', cleanUrl);
  invalidateConfigCache();
  resetAgent();
  return { success: true };
}

export async function testOllamaConnection(url) {
  await requireAdmin();
  try {
    const cleanUrl = (url || '').replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
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

export async function saveGitHubConfig({ token, owner, repo }) {
  await requireAdmin();
  if (token?.trim()) {
    setConfigSecret('GH_TOKEN', token.trim());
    invalidateConfigCache('GH_TOKEN');
  }
  if (owner?.trim()) setConfig('GH_OWNER', owner.trim());
  if (repo?.trim()) setConfig('GH_REPO', repo.trim());
  return { success: true };
}

export async function testGitHubConnection() {
  await requireAdmin();
  try {
    const { testGitHubConnection: test } = await import('../tools/github.js');
    return await test();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveTelegramConfig({ botToken, chatId, webhookSecret }) {
  await requireAdmin();
  if (botToken?.trim()) {
    setConfigSecret('TELEGRAM_BOT_TOKEN', botToken.trim());
    invalidateConfigCache('TELEGRAM_BOT_TOKEN');
  }
  if (chatId !== undefined) setConfig('TELEGRAM_CHAT_ID', chatId.trim());
  if (webhookSecret) {
    setConfigSecret('TELEGRAM_WEBHOOK_SECRET', webhookSecret);
    invalidateConfigCache('TELEGRAM_WEBHOOK_SECRET');
  }

  // Send welcome message if chatId is provided
  let welcomeSent = false;
  if (botToken?.trim() && chatId?.trim()) {
    try {
      const { sendMessage } = await import('../tools/telegram.js');
      await sendMessage(botToken.trim(), chatId.trim(), '👻 GhostBot connected! I\'m ready to help you code.');
      welcomeSent = true;
    } catch {
      // Welcome message is best-effort
    }
  }

  return { success: true, welcomeSent };
}

export async function removeTelegramConfig() {
  await requireAdmin();
  const { deleteConfigSecret } = await import('../db/config.js');
  deleteConfigSecret('TELEGRAM_BOT_TOKEN');
  deleteConfigSecret('TELEGRAM_WEBHOOK_SECRET');
  setConfig('TELEGRAM_CHAT_ID', '');
  invalidateConfigCache();
  return { success: true };
}

export async function getTelegramConfigStatus() {
  await requireAdmin();
  const token = getConfigSecret('TELEGRAM_BOT_TOKEN');
  const chatIdVal = getConfig('TELEGRAM_CHAT_ID');
  const webhookUrl = getConfig('TELEGRAM_WEBHOOK_URL');
  return { configured: !!token, chatId: chatIdVal || '', webhookUrl: webhookUrl || '' };
}

export async function saveTelegramWebhookUrl(url) {
  await requireAdmin();
  const clean = (url || '').replace(/\/+$/, '');
  setConfig('TELEGRAM_WEBHOOK_URL', clean);
  invalidateConfigCache('TELEGRAM_WEBHOOK_URL');
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
