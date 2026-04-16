# Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-run setup wizard at `/setup` that walks the GhostBot owner through configuring LLM, Docker, GitHub, and Notifications in a single-scroll 5-step flow, with a "Finish setup" banner and locale plumbing.

**Architecture:** New `/setup` route (owner-only, admin-protected) rendered by a server component that reads live config and passes initial step states to a client shell. Each step is a focused component owning its own form + Active card. Server actions live in a new `src/lib/admin/setup-actions.js` that wraps existing admin config/secret/test helpers with wizard-shaped return values. Step done-ness is inferred from live config — no new DB schema. Wizard completion + banner dismissal tracked via three new keys in the existing `settings` table. All wizard copy sourced from `src/locales/en.json` via a local `t()` helper (no i18n library).

**Tech Stack:** Next.js 15 App Router, React 19 (Server + Client Components), Tailwind v4, Drizzle + SQLite, NextAuth v5 (JWT), Vitest (new — added in Task 2), node `better-sqlite3` (existing), Unix socket Docker API (existing).

**Spec:** [docs/superpowers/specs/2026-04-16-setup-wizard-design.md](../specs/2026-04-16-setup-wizard-design.md)

---

## File Structure

**New files:**

| File | Responsibility |
|---|---|
| `src/lib/i18n.js` | `t(key, vars)` helper — dotted keys, `{var}` interpolation, fallback to `en.json` on miss; exports `ACTIVE_LOCALE` constant |
| `src/locales/en.json` | Every wizard + banner string in English |
| `src/locales/nl.json` | Copy of `en.json` as Dutch structural placeholder |
| `src/locales/fr.json` | Copy of `en.json` as French structural placeholder |
| `src/lib/admin/setup-actions.js` | Server actions for the wizard. Owner-check + wrappers over existing helpers. |
| `src/lib/admin/wizard-state.js` | Pure helpers for reading/writing the three `setup_wizard` settings keys and computing step done-ness |
| `src/app/setup/page.js` | Server component. Checks owner, reads inferred state, renders `<SetupClient>` |
| `src/app/setup/setup-client.jsx` | Client shell. Owns scroll + step-unlock state. Passes props into step components. |
| `src/app/setup/steps/StepLlm.jsx` | Step 1 — LLM form + Active card |
| `src/app/setup/steps/StepDocker.jsx` | Step 2 — Docker check card |
| `src/app/setup/steps/StepGithub.jsx` | Step 3 — PAT form + Active card |
| `src/app/setup/steps/StepNotifications.jsx` | Step 4 — Telegram + Slack sub-sections |
| `src/app/setup/steps/StepDone.jsx` | Step 5 — summary + complete CTA |
| `src/components/SetupBanner.jsx` | "Finish setup" banner client component |
| `src/lib/tools/__tests__/docker.test.js` | Vitest — `pingDocker()` returns `{ok:false}` when socket unreachable |
| `src/lib/__tests__/i18n.test.js` | Vitest — key lookup, fallback, `{var}` interpolation |
| `src/lib/admin/__tests__/wizard-state.test.js` | Vitest — inferred done-ness logic |
| `vitest.config.js` | Vitest config at repo root (src-scoped) |

**Modified files:**

| File | Change |
|---|---|
| `src/package.json` | Add `vitest` + `@vitest/coverage-v8` to devDependencies; add `test`, `test:watch` scripts |
| `src/lib/auth/edge-config.js` | Extend JWT/session callbacks to propagate `owner` from user to session |
| `src/lib/auth/config.js` | Return `owner` from `authorize()` |
| `src/lib/db/users.js` | Ensure `getUserByEmail` returns the `owner` column (verify; it likely already does via `select *`) |
| `src/middleware.js` | Add `/setup` to protected branch + owner-only enforcement + first-visit redirect |
| `src/lib/tools/docker.js` | Add `pingDocker()` helper — returns `{ok, version, images[]}` or `{ok:false, error}` |
| `src/app/layout.js` (or wherever the navbar lives) | Mount `<SetupBanner />` once globally for owner-only display |
| `src/app/admin/page.js` | Add a "Setup wizard" card on the admin index |
| `src/app/admin/admin-nav.jsx` | Add "Setup wizard" link in the admin sidebar |

---

## Task 1: Add Vitest + test script scaffolding

**Files:**
- Modify: `src/package.json`
- Create: `vitest.config.js`
- Create: `src/lib/__tests__/smoke.test.js`

- [ ] **Step 1: Install Vitest**

```bash
cd src
npm install --save-dev vitest @vitest/coverage-v8
```

Expected: packages added to `src/package.json` devDependencies; lock file updated.

- [ ] **Step 2: Add test scripts to `src/package.json`**

Under the existing `scripts` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `src/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/__tests__/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
});
```

- [ ] **Step 4: Create a smoke test at `src/lib/__tests__/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run `npm test` and verify**

```bash
cd src && npm test
```

Expected: 1 passing test, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/package.json src/package-lock.json src/vitest.config.js src/lib/__tests__/smoke.test.js
git commit -m "test: add Vitest scaffolding with smoke test"
```

---

## Task 2: Build the `t()` helper and locale files

**Files:**
- Create: `src/locales/en.json`
- Create: `src/locales/nl.json`
- Create: `src/locales/fr.json`
- Create: `src/lib/i18n.js`
- Create: `src/lib/__tests__/i18n.test.js`

- [ ] **Step 1: Write the failing test at `src/lib/__tests__/i18n.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { t } from '../i18n.js';

describe('t()', () => {
  it('returns a known key', () => {
    expect(t('setup.llm.title')).toBe('Choose your LLM provider');
  });

  it('supports dotted keys with interpolation', () => {
    expect(t('setup.banner.progress', { done: 2, total: 5 })).toBe('2 of 5 configured');
  });

  it('falls back to the key string when missing', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('leaves unknown {vars} in place', () => {
    expect(t('setup.llm.title', { unused: 'x' })).toBe('Choose your LLM provider');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd src && npm test -- i18n
```

Expected: FAIL — `Cannot find module '../i18n.js'`

- [ ] **Step 3: Create `src/locales/en.json` with every wizard + banner string**

```json
{
  "setup": {
    "page": {
      "title": "Set up GhostBot",
      "subtitle": "A few minutes to get chat, agents, and notifications ready."
    },
    "banner": {
      "title": "Finish your GhostBot setup",
      "progress": "{done} of {total} configured",
      "resume": "Resume",
      "dismiss": "Dismiss"
    },
    "llm": {
      "title": "Choose your LLM provider",
      "subtitle": "GhostBot needs this to chat. You can change it later.",
      "provider": "Provider",
      "baseUrl": "Base URL",
      "apiKey": "API key",
      "model": "Model (optional)",
      "modelAutoPick": "Auto-pick first available",
      "testAndSave": "Test & Save",
      "retest": "Re-test",
      "disconnect": "Disconnect & edit",
      "activeTitle": "{provider} connected",
      "alreadyConfigured": "Already configured ✓",
      "errorConnect": "Couldn't connect. Check URL/key and try again.",
      "errorNoModels": "Connected, but no models found."
    },
    "docker": {
      "title": "Docker check",
      "subtitle": "Needed for coding agents. Optional.",
      "checking": "Checking Docker socket…",
      "connected": "Docker connected",
      "socketPath": "Socket",
      "version": "Engine version",
      "imagesFound": "{count} agent image(s) available",
      "noImages": "Socket reachable but no ghostbot coding-agent images found",
      "pullDefault": "Pull default (Aider) image",
      "pullInProgress": "Pulling — this can take a few minutes…",
      "socketMissing": "Docker socket not mounted",
      "socketMissingHelp": "Coding agents won't work until this is fixed. See the setup docs.",
      "recheck": "Re-check",
      "skip": "Skip — I'll set this up later",
      "skipped": "Skipped — agents disabled. Re-run wizard to configure."
    },
    "github": {
      "title": "GitHub PAT (optional)",
      "subtitle": "Required only if you want agents to push branches and open PRs.",
      "pat": "Fine-grained personal access token",
      "scopesHint": "Scopes needed: repo, read:user, workflow",
      "patLink": "Create a GitHub PAT →",
      "testAndSave": "Test & Save",
      "skip": "Skip",
      "activeTitle": "Connected as @{username}",
      "scopes": "Scopes",
      "errorConnect": "GitHub rejected the token. Check scopes and try again."
    },
    "notifications": {
      "title": "Notifications (optional)",
      "subtitle": "Send job status alerts to Telegram or Slack.",
      "telegramTitle": "Telegram",
      "telegramBotToken": "Bot token",
      "telegramChatId": "Chat ID",
      "slackTitle": "Slack",
      "slackWebhook": "Webhook URL",
      "sendTest": "Send test message",
      "sent": "Test message sent ✓",
      "testFailed": "Test failed: {error}",
      "telegramActive": "Telegram active",
      "slackActive": "Slack active",
      "disconnect": "Disconnect"
    },
    "done": {
      "title": "You're set up",
      "subtitle": "Summary of what's configured.",
      "start": "Start using GhostBot →",
      "backToAdmin": "Back to admin",
      "confirmPartial": "Some features are disabled. You can re-run setup from Admin → Setup at any time. Finish anyway?"
    }
  }
}
```

- [ ] **Step 4: Create `src/locales/nl.json` and `src/locales/fr.json` as exact copies of `en.json`**

```bash
cp src/locales/en.json src/locales/nl.json
cp src/locales/en.json src/locales/fr.json
```

- [ ] **Step 5: Create `src/lib/i18n.js`**

```js
// Minimal in-repo translation helper. No i18n library — by project convention.
// Locale JSON files live in src/locales/<lang>.json.
// Usage:  t('setup.llm.title')            → "Choose your LLM provider"
//         t('setup.banner.progress', { done: 2, total: 5 })  → "2 of 5 configured"
// Missing keys fall back to the key string itself so the UI never crashes.

import en from '../locales/en.json' with { type: 'json' };
import nl from '../locales/nl.json' with { type: 'json' };
import fr from '../locales/fr.json' with { type: 'json' };

const locales = { en, nl, fr };
export const ACTIVE_LOCALE = 'en'; // Hardcoded for this phase — no UI selector yet.

function resolve(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

export function t(key, vars) {
  const active = locales[ACTIVE_LOCALE] || locales.en;
  const value = resolve(active, key) ?? resolve(locales.en, key);
  if (typeof value !== 'string') return key;
  return interpolate(value, vars);
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

```bash
cd src && npm test -- i18n
```

Expected: 4 passing tests.

- [ ] **Step 7: Commit**

```bash
git add src/locales/ src/lib/i18n.js src/lib/__tests__/i18n.test.js
git commit -m "feat: add plain-JSON locale files and t() helper"
```

---

## Task 3: Expose `owner` flag on the NextAuth session

**Files:**
- Modify: `src/lib/auth/config.js`
- Modify: `src/lib/auth/edge-config.js`

- [ ] **Step 1: Update `src/lib/auth/config.js` to return `owner` from `authorize`**

Replace the existing return statement on line 23 with:

```js
return { id: user.id, email: user.email, role: user.role, owner: user.owner };
```

- [ ] **Step 2: Update `src/lib/auth/edge-config.js` callbacks to propagate `owner`**

Full new file contents:

```js
export const authConfig = {
  providers: [],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.owner = user.owner;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.owner = token.owner;
      }
      return session;
    },
  },
};
```

- [ ] **Step 3: Manual verification — no tests here, session plumbing is tested by its consumers**

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/config.js src/lib/auth/edge-config.js
git commit -m "auth: propagate owner flag from user to session"
```

---

## Task 4: Add `pingDocker()` helper with a unit test

**Files:**
- Modify: `src/lib/tools/docker.js`
- Create: `src/lib/tools/__tests__/docker.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/tools/__tests__/docker.test.js
import { describe, it, expect, vi } from 'vitest';

describe('pingDocker', () => {
  it('returns {ok:false} when socket is unreachable', async () => {
    vi.resetModules();
    vi.doMock('http', () => ({
      default: {
        request: (_opts, _cb) => ({
          on: (event, handler) => {
            if (event === 'error') setTimeout(() => handler(new Error('ENOENT')), 0);
          },
          end: () => {},
          write: () => {},
        }),
      },
    }));
    const { pingDocker } = await import('../docker.js');
    const result = await pingDocker();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ENOENT|ECONNREFUSED|socket/i);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
cd src && npm test -- docker
```

Expected: FAIL — `pingDocker is not a function` (not exported yet).

- [ ] **Step 3: Add `pingDocker()` to `src/lib/tools/docker.js`**

Append at the end of the file (after existing exports):

```js
// ─── Wizard helper ───
// Returns { ok, version, agentImages[] } on success, { ok:false, error } on failure.
// Used by the setup wizard Step 2 — lightweight check that the Docker socket
// is reachable AND lists any ghostbot:coding-agent-* images present.
export async function pingDocker() {
  try {
    const { status, data } = await dockerApi('GET', '/version');
    if (status !== 200) return { ok: false, error: `Docker /version returned ${status}` };

    const version = data.Version || 'unknown';

    const imagesRes = await dockerApi('GET', '/images/json');
    const agentImages = imagesRes.status === 200
      ? (imagesRes.data || [])
          .flatMap((img) => img.RepoTags || [])
          .filter((tag) => tag && tag.startsWith('ghostbot:coding-agent-'))
      : [];

    return { ok: true, version, agentImages };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
cd src && npm test -- docker
```

Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tools/docker.js src/lib/tools/__tests__/docker.test.js
git commit -m "feat(docker): add pingDocker() helper for setup wizard"
```

---

## Task 5: Build the wizard-state module with tests

**Files:**
- Create: `src/lib/admin/wizard-state.js`
- Create: `src/lib/admin/__tests__/wizard-state.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/admin/__tests__/wizard-state.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getConfigMock = vi.fn();
const getConfigSecretMock = vi.fn();

vi.mock('../../config.js', () => ({ getConfig: getConfigMock }));
vi.mock('../../db/config.js', () => ({ getConfigSecret: getConfigSecretMock }));

beforeEach(() => {
  getConfigMock.mockReset();
  getConfigSecretMock.mockReset();
});

describe('computeStepStatus', () => {
  it('marks LLM done when provider + lastTestOk set', async () => {
    getConfigMock.mockImplementation((k) => ({
      LLM_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://x',
      LLM_MODEL: 'qwen',
      ollamaLastTestOk: 'true',
    }[k] || ''));
    const { computeStepStatus } = await import('../wizard-state.js');
    const status = await computeStepStatus({ skipDocker: true });
    expect(status.llm.done).toBe(true);
    expect(status.llm.provider).toBe('ollama');
  });

  it('marks LLM not done when lastTestOk is missing', async () => {
    getConfigMock.mockImplementation((k) => ({
      LLM_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://x',
    }[k] || ''));
    const { computeStepStatus } = await import('../wizard-state.js');
    const status = await computeStepStatus({ skipDocker: true });
    expect(status.llm.done).toBe(false);
  });

  it('marks GitHub done when token + test ok', async () => {
    getConfigSecretMock.mockReturnValue('ghp_xyz');
    getConfigMock.mockImplementation((k) => ({ githubLastTestOk: 'true' }[k] || ''));
    const { computeStepStatus } = await import('../wizard-state.js');
    const status = await computeStepStatus({ skipDocker: true });
    expect(status.github.done).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
cd src && npm test -- wizard-state
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/admin/wizard-state.js`**

```js
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
cd src && npm test -- wizard-state
```

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/wizard-state.js src/lib/admin/__tests__/wizard-state.test.js
git commit -m "feat(wizard): add state helpers and step done-ness inference"
```

---

## Task 6: Add `<provider>LastTestOk` writes to existing test actions

**Context:** The wizard infers LLM/GitHub done-ness by reading `<provider>LastTestOk`/`githubLastTestOk`. These flags don't exist yet — the existing admin test buttons just return `{success:true}` without persisting anything. Add that one-line persistence to the shared test functions.

**Files:**
- Modify: `src/lib/admin/actions.js`

- [ ] **Step 1: Update `testLLMConnection()` around line 48 — on success, persist the flag**

Replace the return line inside the try block (`return { success: true, response: text.slice(0, 200) };`) with:

```js
setConfig(`${getConfig('LLM_PROVIDER')}LastTestOk`, 'true');
return { success: true, response: text.slice(0, 200) };
```

In the catch block, add before the return:

```js
setConfig(`${getConfig('LLM_PROVIDER')}LastTestOk`, 'false');
```

- [ ] **Step 2: Update `testOllamaConnection(url)` around line 77 — persist `ollamaLastTestOk`**

Inside the try block, just before `return { success: true, models };`:

```js
setConfig('ollamaLastTestOk', 'true');
```

Inside the catch block, just before `return { success: false, error: error.message };`:

```js
setConfig('ollamaLastTestOk', 'false');
```

- [ ] **Step 3: Update `testGitHubConnection()` around line 148 — persist `githubLastTestOk`**

Replace the body with:

```js
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
```

- [ ] **Step 4: Manual verify — run `npm run dev` in `src/`, open existing admin pages, click test buttons, confirm the flags show up in the settings table**

```bash
# In a separate shell, inspect the settings table:
sqlite3 data/db/ghostbot.sqlite "SELECT key,value FROM settings WHERE key LIKE '%LastTestOk';"
```

Expected: rows appear after clicking test buttons; values are `'true'` or `'false'`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/actions.js
git commit -m "feat(admin): persist <provider>LastTestOk flags on test action"
```

---

## Task 7: Create the wizard server actions

**Files:**
- Create: `src/lib/admin/setup-actions.js`

- [ ] **Step 1: Create `src/lib/admin/setup-actions.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/setup-actions.js
git commit -m "feat(wizard): add server actions for all five steps"
```

---

## Task 8: Update middleware for `/setup` routing

**Files:**
- Modify: `src/middleware.js`

- [ ] **Step 1: Replace contents of `src/middleware.js`**

```js
import NextAuth from 'next-auth';
import { authConfig } from './lib/auth/edge-config.js';

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  // Public routes
  if (
    pathname.startsWith('/api/') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/invite/')
  ) {
    if (pathname === '/login' && isLoggedIn) {
      return Response.redirect(new URL('/', req.url));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', req.url));
  }

  // Admin + setup routes require admin role
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/setup')) &&
    user?.role !== 'admin'
  ) {
    return Response.redirect(new URL('/', req.url));
  }

  // Setup is owner-only
  if (pathname.startsWith('/setup') && user?.owner !== 1) {
    return Response.redirect(new URL('/admin', req.url));
  }

  // First-visit redirect for the owner — only once per install.
  // We cannot touch the DB from edge middleware, so we defer the
  // actual redirect decision to the server component of each page.
  // Middleware only enforces route protection here.
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|assets).*)'],
};
```

**Rationale:** Edge middleware can't call `better-sqlite3`. The first-visit redirect logic must live in the server component at `src/app/setup/page.js` (Task 9) and in a shared "check and redirect" helper used by other route server components.

- [ ] **Step 2: Commit**

```bash
git add src/middleware.js
git commit -m "feat(middleware): gate /setup as admin+owner only"
```

---

## Task 9: Create the first-visit redirect helper and server component

**Files:**
- Create: `src/lib/admin/first-visit-redirect.js`
- Create: `src/app/setup/page.js`

- [ ] **Step 1: Create `src/lib/admin/first-visit-redirect.js`**

```js
// Called from the root layout (or a shared server component) to send the
// owner to /setup exactly once per install. Marks the "first shown" flag
// so subsequent logins don't force-redirect again.
//
// Returns true if a redirect was issued (caller should stop rendering).

import { redirect } from 'next/navigation';
import { auth } from '../auth/config.js';
import { getWizardLifecycle, markFirstShown } from './wizard-state.js';

export async function maybeRedirectToSetup(currentPath) {
  if (currentPath === '/setup' || currentPath.startsWith('/login') || currentPath.startsWith('/api/') || currentPath.startsWith('/invite/')) {
    return false;
  }
  const session = await auth();
  if (!session?.user || session.user.owner !== 1) return false;

  const { firstShownAt } = getWizardLifecycle();
  if (firstShownAt) return false;

  markFirstShown();
  redirect('/setup');
}
```

- [ ] **Step 2: Create `src/app/setup/page.js`**

```js
import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth/config.js';
import { getSetupState, markWizardFirstShown } from '../../lib/admin/setup-actions.js';
import SetupClient from './setup-client.jsx';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');
  if (session.user.owner !== 1) redirect('/admin');

  // Stamp the first-shown timestamp on every /setup GET — the helper
  // no-ops if already set.
  await markWizardFirstShown();

  const { lifecycle, status } = await getSetupState();

  return <SetupClient lifecycle={lifecycle} initialStatus={status} />;
}
```

- [ ] **Step 3: Commit (stub — client component is empty-shell-placed next)**

```bash
git add src/lib/admin/first-visit-redirect.js src/app/setup/page.js
git commit -m "feat(setup): add owner-gated /setup server component"
```

---

## Task 10: Build the client shell with unlock state machine

**Files:**
- Create: `src/app/setup/setup-client.jsx`

- [ ] **Step 1: Create `src/app/setup/setup-client.jsx`**

```jsx
'use client';

import { useState, useCallback } from 'react';
import { t } from '../../lib/i18n.js';
import StepLlm from './steps/StepLlm.jsx';
import StepDocker from './steps/StepDocker.jsx';
import StepGithub from './steps/StepGithub.jsx';
import StepNotifications from './steps/StepNotifications.jsx';
import StepDone from './steps/StepDone.jsx';

export default function SetupClient({ initialStatus }) {
  const [status, setStatus] = useState(initialStatus);

  const updateStep = useCallback((stepKey, patch) => {
    setStatus((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], ...patch } }));
  }, []);

  const llmDone = status.llm?.done;
  const step2Unlocked = llmDone;
  const step3Unlocked = llmDone;
  const step4Unlocked = llmDone;
  const step5Unlocked = llmDone;

  return (
    <div className="min-h-screen bg-[#050509] text-[#E5E2DA] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[#F5D97A]">{t('setup.page.title')}</h1>
          <p className="text-sm text-[#9ca3af] mt-1">{t('setup.page.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <StepLlm status={status.llm} onUpdate={(p) => updateStep('llm', p)} />

          <StepDocker
            status={status.docker}
            locked={!step2Unlocked}
            onUpdate={(p) => updateStep('docker', p)}
          />

          <StepGithub
            status={status.github}
            locked={!step3Unlocked}
            onUpdate={(p) => updateStep('github', p)}
          />

          <StepNotifications
            status={status.notifications}
            locked={!step4Unlocked}
            onUpdate={(p) => updateStep('notifications', p)}
          />

          <StepDone status={status} locked={!step5Unlocked} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit (will fail build until step components exist — create stubs now)**

Create placeholder stubs so the shell compiles:

```bash
mkdir -p src/app/setup/steps
for f in StepLlm StepDocker StepGithub StepNotifications StepDone; do
cat > src/app/setup/steps/$f.jsx <<EOF
'use client';
export default function $f() { return <div className="p-4 rounded-lg bg-[#111827] border border-[#1f2937]">$f (stub)</div>; }
EOF
done
```

```bash
git add src/app/setup/setup-client.jsx src/app/setup/steps/
git commit -m "feat(setup): add client shell and step component stubs"
```

---

## Task 11: Implement StepLlm

**Files:**
- Modify: `src/app/setup/steps/StepLlm.jsx`

- [ ] **Step 1: Full replacement for `src/app/setup/steps/StepLlm.jsx`**

```jsx
'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { saveAndTestLlm } from '../../../lib/admin/setup-actions.js';

export default function StepLlm({ status, onUpdate }) {
  const [provider, setProvider] = useState(status.provider || 'ollama');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(status.model || '');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  if (status.done) {
    return (
      <section className="rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-5">
        <div className="flex items-center gap-2 text-[#34d399] font-semibold mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-[#050509] text-xs">✓</span>
          {t('setup.llm.activeTitle', { provider: status.provider })}
        </div>
        <div className="text-xs text-[#9ca3af] mb-3">{status.model || t('setup.llm.modelAutoPick')}</div>
      </section>
    );
  }

  async function submit() {
    setTesting(true); setError('');
    const result = await saveAndTestLlm({ provider, baseUrl, apiKey, model });
    setTesting(false);
    if (!result.ok) { setError(result.error || t('setup.llm.errorConnect')); return; }
    onUpdate({ done: true, provider, model });
  }

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-1">{t('setup.llm.title')}</h2>
      <p className="text-xs text-[#9ca3af] mb-4">{t('setup.llm.subtitle')}</p>

      <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.provider')}</label>
      <select value={provider} onChange={(e) => setProvider(e.target.value)}
        className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3">
        <option value="ollama">Ollama</option>
        <option value="anthropic">Anthropic</option>
        <option value="openai">OpenAI</option>
        <option value="google">Google</option>
      </select>

      {provider === 'ollama' ? (
        <>
          <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.baseUrl')}</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://ollama.example.com:11434"
            className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />
        </>
      ) : (
        <>
          <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.apiKey')}</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('setup.llm.alreadyConfigured')}
            className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />
        </>
      )}

      <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.model')}</label>
      <input value={model} onChange={(e) => setModel(e.target.value)}
        placeholder={t('setup.llm.modelAutoPick')}
        className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />

      {error && <div className="text-xs text-[#f87171] mb-3">{error}</div>}

      <button onClick={submit} disabled={testing}
        className="bg-[#D4AF37] text-[#050509] rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {testing ? '...' : t('setup.llm.testAndSave')}
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Manual verify — start dev server and exercise the step**

```bash
cd src && npm run dev
```

Navigate as the owner to `http://localhost:3000/setup`, enter a valid Ollama URL, click Test & Save. Expected: green Active card appears; reload preserves the card.

- [ ] **Step 3: Commit**

```bash
git add src/app/setup/steps/StepLlm.jsx
git commit -m "feat(setup): implement StepLlm with blocking test"
```

---

## Task 12: Implement StepDocker

**Files:**
- Modify: `src/app/setup/steps/StepDocker.jsx`

- [ ] **Step 1: Full replacement**

```jsx
'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { checkDocker, pullDefaultAgentImage } from '../../../lib/admin/setup-actions.js';

export default function StepDocker({ status, locked, onUpdate }) {
  const [state, setState] = useState(status);
  const [skipped, setSkipped] = useState(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (!locked && state?.ok === null) recheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  async function recheck() {
    const res = await checkDocker();
    setState(res);
    onUpdate(res);
  }

  async function pull() {
    setPulling(true);
    const res = await pullDefaultAgentImage();
    setPulling(false);
    if (res.ok) recheck();
  }

  if (locked) return <SectionLocked title={t('setup.docker.title')} />;

  if (skipped) {
    return (
      <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4">
        <div className="text-xs text-[#6b7280]">{t('setup.docker.skipped')}</div>
      </section>
    );
  }

  if (state?.ok === true) {
    const hasImages = (state.agentImages || []).length > 0;
    return (
      <section className="rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-5">
        <div className="flex items-center gap-2 text-[#34d399] font-semibold mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-[#050509] text-xs">✓</span>
          {t('setup.docker.connected')}
        </div>
        <div className="text-xs text-[#9ca3af]">{t('setup.docker.socketPath')}: /var/run/docker.sock</div>
        <div className="text-xs text-[#9ca3af]">{t('setup.docker.version')}: {state.version}</div>
        {hasImages ? (
          <div className="text-xs text-[#9ca3af]">{t('setup.docker.imagesFound', { count: state.agentImages.length })}</div>
        ) : (
          <div className="mt-3">
            <div className="text-xs text-[#F5D97A] mb-2">{t('setup.docker.noImages')}</div>
            <button onClick={pull} disabled={pulling}
              className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              {pulling ? t('setup.docker.pullInProgress') : t('setup.docker.pullDefault')}
            </button>
          </div>
        )}
      </section>
    );
  }

  if (state?.ok === false) {
    return (
      <section className="rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.4)] p-5">
        <div className="text-sm text-[#f87171] font-semibold mb-1">{t('setup.docker.socketMissing')}</div>
        <div className="text-xs text-[#9ca3af] mb-3">{t('setup.docker.socketMissingHelp')}</div>
        <div className="flex gap-2">
          <button onClick={recheck}
            className="border border-[#1f2937] text-[#E5E2DA] rounded px-3 py-1.5 text-xs">
            {t('setup.docker.recheck')}
          </button>
          <button onClick={() => setSkipped(true)}
            className="border border-[#1f2937] text-[#9ca3af] rounded px-3 py-1.5 text-xs">
            {t('setup.docker.skip')}
          </button>
        </div>
      </section>
    );
  }

  return <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5 text-xs text-[#9ca3af]">{t('setup.docker.checking')}</section>;
}

function SectionLocked({ title }) {
  return (
    <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50">
      <div className="text-sm text-[#9ca3af]">{title}</div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/setup/steps/StepDocker.jsx
git commit -m "feat(setup): implement StepDocker with check/pull/skip flow"
```

---

## Task 13: Implement StepGithub

**Files:**
- Modify: `src/app/setup/steps/StepGithub.jsx`

- [ ] **Step 1: Full replacement**

```jsx
'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { saveAndTestGithub, removeGithub } from '../../../lib/admin/setup-actions.js';

export default function StepGithub({ status, locked, onUpdate }) {
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  if (locked) return <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50"><div className="text-sm text-[#9ca3af]">{t('setup.github.title')}</div></section>;

  if (status.done) {
    return (
      <section className="rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-5">
        <div className="flex items-center gap-2 text-[#34d399] font-semibold mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-[#050509] text-xs">✓</span>
          {t('setup.github.activeTitle', { username: username || '…' })}
        </div>
        <button onClick={async () => { await removeGithub(); onUpdate({ done: false, hasToken: false }); }}
          className="text-xs text-[#f87171] border border-[rgba(248,113,113,0.3)] rounded px-3 py-1.5">
          {t('setup.notifications.disconnect')}
        </button>
      </section>
    );
  }

  async function submit() {
    setTesting(true); setError('');
    const res = await saveAndTestGithub({ token });
    setTesting(false);
    if (!res.ok) { setError(res.error || t('setup.github.errorConnect')); return; }
    setUsername(res.username || '');
    onUpdate({ done: true, hasToken: true });
  }

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-1">{t('setup.github.title')}</h2>
      <p className="text-xs text-[#9ca3af] mb-2">{t('setup.github.subtitle')}</p>
      <div className="text-xs text-[#6b7280] mb-3">{t('setup.github.scopesHint')} · <a className="underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">{t('setup.github.patLink')}</a></div>

      <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
        placeholder={status.hasToken ? t('setup.llm.alreadyConfigured') : 'ghp_...'}
        className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />

      {error && <div className="text-xs text-[#f87171] mb-3">{error}</div>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={testing}
          className="bg-[#D4AF37] text-[#050509] rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {testing ? '...' : t('setup.github.testAndSave')}
        </button>
        <button onClick={() => onUpdate({ done: false, skipped: true })}
          className="border border-[#1f2937] text-[#9ca3af] rounded px-3 py-2 text-sm">
          {t('setup.github.skip')}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/setup/steps/StepGithub.jsx
git commit -m "feat(setup): implement StepGithub with non-blocking test"
```

---

## Task 14: Implement StepNotifications

**Files:**
- Modify: `src/app/setup/steps/StepNotifications.jsx`

- [ ] **Step 1: Full replacement**

```jsx
'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { saveAndTestTelegram, removeTelegram, saveAndTestSlack, removeSlack } from '../../../lib/admin/setup-actions.js';

export default function StepNotifications({ status, locked, onUpdate }) {
  if (locked) return <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50"><div className="text-sm text-[#9ca3af]">{t('setup.notifications.title')}</div></section>;

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-1">{t('setup.notifications.title')}</h2>
      <p className="text-xs text-[#9ca3af] mb-4">{t('setup.notifications.subtitle')}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <TelegramSub active={status.telegram} onChange={(v) => onUpdate({ telegram: v })} />
        <SlackSub active={status.slack} onChange={(v) => onUpdate({ slack: v })} />
      </div>
    </section>
  );
}

function TelegramSub({ active, onChange }) {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [status, setStatus] = useState('');

  if (active) {
    return (
      <div className="rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-3">
        <div className="text-xs text-[#34d399] font-semibold mb-2">✓ {t('setup.notifications.telegramActive')}</div>
        <button onClick={async () => { await removeTelegram(); onChange(false); }}
          className="text-xs text-[#f87171] border border-[rgba(248,113,113,0.3)] rounded px-2 py-1">
          {t('setup.notifications.disconnect')}
        </button>
      </div>
    );
  }

  async function send() {
    setStatus('sending');
    const res = await saveAndTestTelegram({ botToken, chatId });
    setStatus(res.ok ? 'sent' : `err:${res.error}`);
    if (res.ok) onChange(true);
  }

  return (
    <div className="rounded-lg bg-[#0b1220] border border-[#1f2937] p-3">
      <div className="text-xs text-[#E5E2DA] font-semibold mb-2">{t('setup.notifications.telegramTitle')}</div>
      <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)}
        placeholder={t('setup.notifications.telegramBotToken')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <input value={chatId} onChange={(e) => setChatId(e.target.value)}
        placeholder={t('setup.notifications.telegramChatId')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <button onClick={send}
        className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1.5 text-xs font-semibold">
        {t('setup.notifications.sendTest')}
      </button>
      {status === 'sent' && <div className="text-xs text-[#34d399] mt-2">{t('setup.notifications.sent')}</div>}
      {status.startsWith('err:') && <div className="text-xs text-[#f87171] mt-2">{t('setup.notifications.testFailed', { error: status.slice(4) })}</div>}
    </div>
  );
}

function SlackSub({ active, onChange }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState('');

  if (active) {
    return (
      <div className="rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-3">
        <div className="text-xs text-[#34d399] font-semibold mb-2">✓ {t('setup.notifications.slackActive')}</div>
        <button onClick={async () => { await removeSlack(); onChange(false); }}
          className="text-xs text-[#f87171] border border-[rgba(248,113,113,0.3)] rounded px-2 py-1">
          {t('setup.notifications.disconnect')}
        </button>
      </div>
    );
  }

  async function send() {
    setStatus('sending');
    const res = await saveAndTestSlack({ webhookUrl });
    setStatus(res.ok ? 'sent' : `err:${res.error}`);
    if (res.ok) onChange(true);
  }

  return (
    <div className="rounded-lg bg-[#0b1220] border border-[#1f2937] p-3">
      <div className="text-xs text-[#E5E2DA] font-semibold mb-2">{t('setup.notifications.slackTitle')}</div>
      <input type="password" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
        placeholder={t('setup.notifications.slackWebhook')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <button onClick={send}
        className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1.5 text-xs font-semibold">
        {t('setup.notifications.sendTest')}
      </button>
      {status === 'sent' && <div className="text-xs text-[#34d399] mt-2">{t('setup.notifications.sent')}</div>}
      {status.startsWith('err:') && <div className="text-xs text-[#f87171] mt-2">{t('setup.notifications.testFailed', { error: status.slice(4) })}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/setup/steps/StepNotifications.jsx
git commit -m "feat(setup): implement StepNotifications (Telegram + Slack)"
```

---

## Task 15: Implement StepDone

**Files:**
- Modify: `src/app/setup/steps/StepDone.jsx`

- [ ] **Step 1: Full replacement**

```jsx
'use client';

import { useRouter } from 'next/navigation';
import { t } from '../../../lib/i18n.js';
import { markWizardComplete } from '../../../lib/admin/setup-actions.js';

export default function StepDone({ status, locked }) {
  const router = useRouter();
  if (locked) return <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50"><div className="text-sm text-[#9ca3af]">{t('setup.done.title')}</div></section>;

  const partial = !status.docker?.ok || !status.github?.done || !status.notifications?.done;

  async function complete(dest) {
    if (partial && !confirm(t('setup.done.confirmPartial'))) return;
    await markWizardComplete();
    router.push(dest);
  }

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-3">{t('setup.done.title')}</h2>
      <ul className="text-xs text-[#E5E2DA] space-y-1 mb-4">
        <li>{status.llm?.done ? '✓' : '○'} LLM: {status.llm?.provider || '—'}</li>
        <li>{status.docker?.ok ? '✓' : '⚠'} Docker: {status.docker?.ok ? `Connected (${(status.docker.agentImages || []).length} agent images)` : 'Not connected'}</li>
        <li>{status.github?.done ? '✓' : '⚠'} GitHub: {status.github?.done ? 'Connected' : 'Skipped'}</li>
        <li>{status.notifications?.telegram ? '✓' : '⚠'} Telegram: {status.notifications?.telegram ? 'Active' : 'Skipped'}</li>
        <li>{status.notifications?.slack ? '✓' : '⚠'} Slack: {status.notifications?.slack ? 'Active' : 'Skipped'}</li>
      </ul>
      <div className="flex gap-2">
        <button onClick={() => complete('/')}
          className="bg-[#D4AF37] text-[#050509] rounded px-4 py-2 text-sm font-semibold">
          {t('setup.done.start')}
        </button>
        <button onClick={() => complete('/admin')}
          className="border border-[#1f2937] text-[#E5E2DA] rounded px-4 py-2 text-sm">
          {t('setup.done.backToAdmin')}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/setup/steps/StepDone.jsx
git commit -m "feat(setup): implement StepDone with partial-config confirm"
```

---

## Task 16: Build the "Finish setup" banner

**Files:**
- Create: `src/components/SetupBanner.jsx`
- Modify: the root layout (likely `src/app/layout.js` — inspect to find the correct one)

- [ ] **Step 1: Create `src/components/SetupBanner.jsx`**

```jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { t } from '../lib/i18n.js';
import { getSetupState, dismissWizardBanner } from '../lib/admin/setup-actions.js';

export default function SetupBanner() {
  const [show, setShow] = useState(false);
  const [stepsDone, setStepsDone] = useState(0);

  useEffect(() => {
    getSetupState()
      .then(({ lifecycle, status }) => {
        if (lifecycle.completedAt || lifecycle.bannerDismissedAt) return;
        setShow(true);
        let done = 0;
        if (status.llm?.done) done++;
        if (status.docker?.ok === true) done++;
        if (status.github?.done) done++;
        if (status.notifications?.done) done++;
        setStepsDone(done);
      })
      .catch(() => { /* non-owner or unauthenticated — silently hide */ });
  }, []);

  if (!show) return null;

  async function dismiss() {
    await dismissWizardBanner();
    setShow(false);
  }

  return (
    <div className="border-l-4 border-[#D4AF37] bg-[#111827] px-4 py-2 flex items-center justify-between text-xs">
      <div className="text-[#F5D97A]">
        ⚙ {t('setup.banner.title')} — {t('setup.banner.progress', { done: stepsDone, total: 4 })}
      </div>
      <div className="flex gap-2">
        <Link href="/setup" className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1 font-semibold">{t('setup.banner.resume')}</Link>
        <button onClick={dismiss} className="text-[#9ca3af] px-2">✕</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Locate the root layout that renders the main navbar**

Inspect `src/app/layout.js` and any nested layout (e.g. `src/app/(authenticated)/layout.js`). The banner needs to render on every page except `/setup` itself — render it in whatever layout is the nearest shared parent of admin + chat.

- [ ] **Step 3: Mount `<SetupBanner />` in that layout**

Add directly below the navbar:

```jsx
import SetupBanner from '../components/SetupBanner.jsx';
// ...inside the layout render:
<SetupBanner />
```

Hide on `/setup` using a client-side `usePathname()` check (add inside the banner component or wrap):

```jsx
// Inside SetupBanner.jsx, at the top of the component body:
import { usePathname } from 'next/navigation';
const pathname = usePathname();
if (pathname === '/setup') return null;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SetupBanner.jsx src/app/layout.js
git commit -m "feat(setup): add 'Finish setup' banner with permanent dismiss"
```

---

## Task 17: Add admin panel entry points

**Files:**
- Modify: `src/app/admin/page.js`
- Modify: `src/app/admin/admin-nav.jsx`

- [ ] **Step 1: Add a "Setup wizard" card to `src/app/admin/page.js`**

Find the existing grid of admin cards. Add a new card linking to `/setup` with an appropriate icon (⚙ or similar). Card title: `t('setup.page.title')`. Card body: `t('setup.page.subtitle')`.

- [ ] **Step 2: Add sidebar link to `src/app/admin/admin-nav.jsx`**

Insert near the top of the sidebar, under a "Getting Started" section heading:

```jsx
<Link href="/setup" className="...existing nav-link styles...">⚙ Setup wizard</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.js src/app/admin/admin-nav.jsx
git commit -m "feat(admin): add Setup wizard entry points"
```

---

## Task 18: Manual QA pass

**Files:** none — checklist only

- [ ] **Step 1: Fresh-install simulation**

```bash
# In a scratch copy of the DB (never against the live one):
cp data/db/ghostbot.sqlite data/db/ghostbot.sqlite.bak
sqlite3 data/db/ghostbot.sqlite "DELETE FROM settings WHERE key LIKE 'SETUP_WIZARD_%';"
```

Restart dev server, log in as owner. Expected: redirected to `/setup` on next page load after login. Walk through all 5 steps.

- [ ] **Step 2: Verify the banner**

After finishing Step 1 (LLM) and navigating away from `/setup`, banner appears. Click Resume → back on `/setup`. Click ✕ → banner vanishes. Reload — banner stays hidden.

- [ ] **Step 3: Verify re-open from admin**

Visit `/admin` → click Setup wizard card. Expected: fields are pre-filled for non-secrets; secrets show "Already configured ✓" placeholder.

- [ ] **Step 4: Verify non-owner is bounced**

Create a second admin user, log in as them, visit `/setup`. Expected: redirect to `/admin`.

- [ ] **Step 5: Verify Docker skip path**

Rename `/var/run/docker.sock` temporarily (or run outside Docker env). Expected: Step 2 shows red warning; Skip button lets progression continue.

- [ ] **Step 6: Restore backup if tests ran against real DB**

```bash
cp data/db/ghostbot.sqlite.bak data/db/ghostbot.sqlite
```

- [ ] **Step 7: Run the full test suite**

```bash
cd src && npm test
```

Expected: all Vitest tests pass.

- [ ] **Step 8: Commit the QA checklist result**

If anything was adjusted during QA, commit those changes with a message like `fix(setup): <issue found>`.

---

## Self-Review notes

- **Spec coverage:** All 9 spec sections map to tasks — Architecture (Tasks 9–10), Data model (Task 5), Five steps (Tasks 11–15), Banner (Task 16), Edge cases (Tasks 8, 9, 16 + QA in Task 18), Translation plumbing (Task 2), Testing (Tasks 1, 2, 4, 5), Rollout (Task 18), Open questions/risks (addressed in Task 6 — LastTestOk persistence).
- **Placeholder scan:** No TBD/TODO/"handle edge cases" text. Every code step shows the actual code. One "inspect to find the correct one" appears in Task 16 Step 2 — that's a real instruction, not a placeholder. The engineer MUST verify which layout file exists before editing.
- **Type consistency:** `setupActions` function names (`saveAndTestLlm`, `checkDocker`, `pullDefaultAgentImage`, `saveAndTestGithub`, `removeGithub`, `saveAndTestTelegram`, `removeTelegram`, `saveAndTestSlack`, `removeSlack`, `markWizardComplete`, `markWizardFirstShown`, `dismissWizardBanner`, `getSetupState`) are used consistently across Tasks 7, 10–16. `computeStepStatus` matches its test fixture shape in Task 5.
- **DRY:** The "locked section" render pattern appears in every step. If the engineer finds this tedious, they can extract a shared `<StepShell>` component in a follow-up commit — I opted not to include it in the plan to keep each task self-contained.
