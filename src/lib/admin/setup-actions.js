'use server';

import { auth } from '../auth/config.js';
import { setConfig } from '../config.js';
import { getConfigSecret } from '../db/config.js';
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
  try {
    const lifecycle = getWizardLifecycle();
    const status = await computeStepStatus();
    return { lifecycle, status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
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
  try {
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
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Step 2: Docker ───

export async function checkDocker() {
  await requireOwner();
  try {
    return await pingDocker();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// GhostBot coding-agent images are built locally (see src/containers/agents/).
// They are NOT on a public registry, so we can't docker-pull them. Instead,
// surface the build instructions so the owner knows how to create them.
export async function getAgentImageBuildInstructions() {
  await requireOwner();
  return {
    ok: true,
    message: 'Agent images are built locally. See the build script under src/containers/agents/.',
    commands: ['cd src/containers/agents', './build.sh'],
  };
}

// ─── Step 3: GitHub ───

export async function saveAndTestGithub({ token }) {
  await requireOwner();
  try {
    if (!token?.trim()) {
      const existing = getConfigSecret('GH_TOKEN');
      if (!existing) return { ok: false, error: 'Token required' };
    } else {
      await saveGitHubConfig({ token: token.trim() });
    }
    const result = await testGitHubConnection();
    if (!result.success) return { ok: false, error: result.error };
    return { ok: true, username: result.user?.login, scopes: result.scopes };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function removeGithub() {
  await requireOwner();
  try {
    await removeGitHubConfig();
    setConfig('githubLastTestOk', 'false');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Step 4: Notifications ───

export async function saveAndTestTelegram({ botToken, chatId }) {
  await requireOwner();
  try {
    if (botToken?.trim()) await saveTelegramConfig({ botToken: botToken.trim(), chatId });
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
  try {
    await removeTelegramConfig();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function saveAndTestSlack({ botToken, channel }) {
  await requireOwner();
  try {
    if (botToken?.trim()) await saveSlackConfig({ botToken: botToken.trim(), channel });
    else if (channel !== undefined) await saveSlackConfig({ channel });
    const result = await testSlackConnection();
    if (!result.success) return { ok: false, error: result.error };
    return { ok: true, team: result.team, user: result.user };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function removeSlack() {
  await requireOwner();
  try {
    await removeSlackConfig();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
