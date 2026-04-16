'use server';

import { auth } from '../auth/config.js';
import { getConfig, setConfig, invalidateConfigCache } from '../config.js';
import { setConfigSecret, getConfigSecret, deleteConfigSecret } from '../db/config.js';
import {
  testLLMConnection,
  testOllamaConnection,
  saveProviderConfig,
  saveApiKey,
  saveOllamaUrl,
  saveGitHubConfig,
  testGitHubConnection,
  removeGitHubConfig,
  saveTelegramConfig,
  removeTelegramConfig,
  saveSlackConfig,
  removeSlackConfig,
  testSlackConnection,
} from './actions.js';
import { pingDocker } from '../tools/docker.js';
import {
  getWizardLifecycle,
  markFirstShown,
  markCompleted,
  dismissBanner as dismissBannerState,
  computeStepStatus,
} from './wizard-state.js';

async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin' || session.user.owner !== 1) {
    throw new Error('Owner access required');
  }
  return session;
}

// ─── State ───

export async function getSetupState() {
  await requireOwner();
  const lifecycle = getWizardLifecycle();
  const status = await computeStepStatus();
  return { lifecycle, status };
}

export async function markWizardFirstShown() {
  await requireOwner();
  markFirstShown();
  return { ok: true };
}

export async function markWizardComplete() {
  await requireOwner();
  markCompleted();
  return { ok: true };
}

export async function dismissWizardBanner() {
  await requireOwner();
  dismissBannerState();
  return { ok: true };
}

// ─── Step 1: LLM ───

export async function saveAndTestLlm({ provider, baseUrl, apiKey, model }) {
  await requireOwner();
  if (provider === 'ollama') {
    const testResult = await testOllamaConnection(baseUrl);
    if (!testResult.success) return { ok: false, error: testResult.error };
    await saveOllamaUrl(baseUrl);
    await saveProviderConfig('ollama', model || (testResult.models?.[0]?.name ?? ''));
    return { ok: true, models: testResult.models };
  }

  const keyName = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
  }[provider];
  if (!keyName) return { ok: false, error: `Unknown provider: ${provider}` };

  if (apiKey?.trim()) await saveApiKey(keyName, apiKey.trim());
  await saveProviderConfig(provider, model || '');

  const testResult = await testLLMConnection();
  if (!testResult.success) return { ok: false, error: testResult.error };
  return { ok: true };
}

// ─── Step 2: Docker ───

export async function checkDocker() {
  await requireOwner();
  return pingDocker();
}

export async function pullDefaultAgentImage() {
  await requireOwner();
  const { dockerApi } = await import('../tools/docker.js');
  const res = await dockerApi('POST', '/images/create?fromImage=ghostbot&tag=coding-agent-aider');
  if (res.status !== 200) {
    return { ok: false, error: `Pull failed (${res.status}): ${JSON.stringify(res.data)}` };
  }
  return { ok: true };
}

// ─── Step 3: GitHub ───

export async function saveAndTestGithub({ token }) {
  await requireOwner();
  if (!token?.trim()) {
    const existing = getConfigSecret('GH_TOKEN');
    if (!existing) return { ok: false, error: 'Token required' };
  } else {
    await saveGitHubConfig({ token: token.trim() });
  }
  const result = await testGitHubConnection();
  if (!result.success) return { ok: false, error: result.error };
  return { ok: true, username: result.user?.login, scopes: result.scopes };
}

export async function removeGithub() {
  await requireOwner();
  await removeGitHubConfig();
  setConfig('githubLastTestOk', 'false');
  return { ok: true };
}

// ─── Step 4: Notifications ───

export async function saveAndTestTelegram({ botToken, chatId }) {
  await requireOwner();
  if (botToken?.trim()) await saveTelegramConfig({ botToken: botToken.trim(), chatId });
  try {
    const { sendMessage } = await import('../tools/telegram.js');
    const token = getConfigSecret('TELEGRAM_BOT_TOKEN');
    await sendMessage(token, chatId, '👻 GhostBot setup test — you should see this if Telegram is wired up.');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function removeTelegram() {
  await requireOwner();
  await removeTelegramConfig();
  return { ok: true };
}

export async function saveAndTestSlack({ webhookUrl }) {
  await requireOwner();
  if (webhookUrl?.trim()) await saveSlackConfig({ botToken: webhookUrl.trim() });
  const result = await testSlackConnection();
  if (!result.success) return { ok: false, error: result.error };
  return { ok: true };
}

export async function removeSlack() {
  await requireOwner();
  await removeSlackConfig();
  return { ok: true };
}
