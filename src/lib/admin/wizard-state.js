// Pure helpers for the setup wizard's state — computes inferred per-step
// done-ness from live config (no separate "is this step done" column).
//
// Completion + banner dismissal live in the existing settings table under
// type='setup_wizard'. We touch those through getConfig/setConfig which
// already stores into settings with type='config' — for consistency we
// piggyback on that same table via setConfig/getConfig with UPPER_SNAKE keys.
//
// The three lifecycle keys:
//   SETUP_WIZARD_FIRST_SHOWN_AT  — ms epoch or '' if never redirected
//   SETUP_WIZARD_COMPLETED_AT    — ms epoch or '' if not yet complete
//   SETUP_WIZARD_BANNER_DISMISSED_AT  — ms epoch or ''

import { getConfig, setConfig } from '../config.js';
import { getConfigSecret } from '../db/config.js';

export function getWizardLifecycle() {
  return {
    firstShownAt: Number(getConfig('SETUP_WIZARD_FIRST_SHOWN_AT')) || null,
    completedAt: Number(getConfig('SETUP_WIZARD_COMPLETED_AT')) || null,
    bannerDismissedAt: Number(getConfig('SETUP_WIZARD_BANNER_DISMISSED_AT')) || null,
  };
}

export function markFirstShown() {
  if (!getConfig('SETUP_WIZARD_FIRST_SHOWN_AT')) {
    setConfig('SETUP_WIZARD_FIRST_SHOWN_AT', String(Date.now()));
  }
}

export function markCompleted() {
  setConfig('SETUP_WIZARD_COMPLETED_AT', String(Date.now()));
}

export function dismissBanner() {
  setConfig('SETUP_WIZARD_BANNER_DISMISSED_AT', String(Date.now()));
}

// Each provider writes <provider>LastTestOk when its admin page's test passes.
// Wizard task coupling: the server action for each step must set this flag too.
function providerTestOk(provider) {
  const key = `${provider}LastTestOk`;
  return getConfig(key) === 'true';
}

export async function computeStepStatus({ skipDocker = false } = {}) {
  const provider = getConfig('LLM_PROVIDER') || '';
  const model = getConfig('LLM_MODEL') || '';
  const ollamaBaseUrl = getConfig('OLLAMA_BASE_URL') || '';
  const llmHasConfig = !!provider && (
    provider === 'ollama' ? !!ollamaBaseUrl :
    !!getConfigSecret(`${provider.toUpperCase()}_API_KEY`)
  );
  const llmDone = llmHasConfig && providerTestOk(provider);

  const githubToken = getConfigSecret('GH_TOKEN') || '';
  const githubDone = !!githubToken && getConfig('githubLastTestOk') === 'true';

  const telegramToken = getConfigSecret('TELEGRAM_BOT_TOKEN') || '';
  const slackToken = getConfigSecret('SLACK_BOT_TOKEN') || '';
  const notifDone = !!telegramToken || !!slackToken;

  let dockerStatus = { ok: null, skipped: true };
  if (!skipDocker) {
    const { pingDocker } = await import('../tools/docker.js');
    dockerStatus = await pingDocker();
  }

  return {
    llm: { done: llmDone, provider, model },
    docker: dockerStatus,
    github: { done: githubDone, hasToken: !!githubToken },
    notifications: {
      done: notifDone,
      telegram: !!telegramToken,
      slack: !!slackToken,
    },
  };
}
