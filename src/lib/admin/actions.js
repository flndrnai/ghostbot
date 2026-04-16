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
    setConfig(`${getConfig('LLM_PROVIDER')}LastTestOk`, 'true');
    return { success: true, response: text.slice(0, 200) };
  } catch (error) {
    let msg = error.message || 'Unknown error';
    if (error.cause) msg += ` (${error.cause.message || error.cause})`;
    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
      msg = 'Cannot connect to LLM API. Check your network connection and API key.';
    }
    setConfig(`${getConfig('LLM_PROVIDER')}LastTestOk`, 'false');
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
    setConfig('ollamaLastTestOk', 'true');
    return { success: true, models };
  } catch (error) {
    setConfig('ollamaLastTestOk', 'false');
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
  try {
    if (token?.trim()) {
      setConfigSecret('GH_TOKEN', token.trim());
      invalidateConfigCache('GH_TOKEN');
    }
    if (owner?.trim()) {
      setConfig('GH_OWNER', owner.trim());
      invalidateConfigCache('GH_OWNER');
    }
    if (repo?.trim()) {
      setConfig('GH_REPO', repo.trim());
      invalidateConfigCache('GH_REPO');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getGitHubConfigStatus() {
  await requireAdmin();
  const token = getConfigSecret('GH_TOKEN');
  const owner = getConfig('GH_OWNER');
  const repo = getConfig('GH_REPO');
  return {
    configured: !!token,
    owner: owner || '',
    repo: repo || '',
  };
}

export async function removeGitHubConfig() {
  await requireAdmin();
  const { deleteConfigSecret } = await import('../db/config.js');
  deleteConfigSecret('GH_TOKEN');
  setConfig('GH_OWNER', '');
  setConfig('GH_REPO', '');
  invalidateConfigCache();
  return { success: true };
}

export async function testGitHubConnection() {
  await requireAdmin();
  try {
    const { testGitHubConnection: test } = await import('../tools/github.js');
    const result = await test();
    setConfig('githubLastTestOk', result.success ? 'true' : 'false');
    return result;
  } catch (error) {
    setConfig('githubLastTestOk', 'false');
    return { success: false, error: error.message };
  }
}

export async function saveGitHubWebhookSecret(secret) {
  await requireAdmin();
  const clean = (secret || '').trim();
  if (!clean) {
    return { success: false, error: 'Secret cannot be empty' };
  }
  setConfigSecret('GITHUB_WEBHOOK_SECRET', clean);
  invalidateConfigCache('GITHUB_WEBHOOK_SECRET');
  return { success: true };
}

export async function removeGitHubWebhookSecret() {
  await requireAdmin();
  const { deleteConfigSecret } = await import('../db/config.js');
  deleteConfigSecret('GITHUB_WEBHOOK_SECRET');
  invalidateConfigCache('GITHUB_WEBHOOK_SECRET');
  return { success: true };
}

export async function getGitHubWebhookSecretStatus() {
  await requireAdmin();
  const secret = getConfigSecret('GITHUB_WEBHOOK_SECRET');
  return { configured: !!secret };
}

export async function generateWebhookSecret() {
  await requireAdmin();
  // 32 random bytes => 64 hex chars. Plenty of entropy for HMAC-SHA256.
  const { randomBytes } = await import('crypto');
  return { secret: randomBytes(32).toString('hex') };
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

// ─── Slack ───

export async function saveSlackConfig({ botToken, channel }) {
  await requireAdmin();
  if (botToken?.trim()) {
    setConfigSecret('SLACK_BOT_TOKEN', botToken.trim());
    invalidateConfigCache('SLACK_BOT_TOKEN');
  }
  if (channel !== undefined) {
    setConfig('SLACK_CHANNEL', (channel || '').trim());
  }
  return { success: true };
}

export async function removeSlackConfig() {
  await requireAdmin();
  const { deleteConfigSecret } = await import('../db/config.js');
  deleteConfigSecret('SLACK_BOT_TOKEN');
  setConfig('SLACK_CHANNEL', '');
  invalidateConfigCache();
  return { success: true };
}

export async function getSlackConfigStatus() {
  await requireAdmin();
  const token = getConfigSecret('SLACK_BOT_TOKEN');
  const channel = getConfig('SLACK_CHANNEL');
  return { configured: !!token, channel: channel || '' };
}

export async function testSlackConnection() {
  await requireAdmin();
  try {
    const token = getConfigSecret('SLACK_BOT_TOKEN');
    if (!token) return { success: false, error: 'No Slack bot token configured' };
    const { slackAuthTest, slackPostMessage } = await import('../tools/slack.js');
    const auth = await slackAuthTest(token);
    if (!auth.ok) return { success: false, error: auth.error };

    // Optionally post a hello to the configured channel
    const channel = getConfig('SLACK_CHANNEL');
    let posted = false;
    if (channel) {
      try {
        await slackPostMessage(token, channel, '👻 GhostBot connected to Slack successfully.');
        posted = true;
      } catch (err) {
        return { success: false, error: `Auth OK but posting to ${channel} failed: ${err.message}` };
      }
    }
    return { success: true, team: auth.team, user: auth.user, posted };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
