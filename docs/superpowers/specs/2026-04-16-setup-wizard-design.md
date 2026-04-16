# Setup Wizard — Design Spec

**Date:** 2026-04-16
**Status:** Approved for implementation
**Roadmap:** Phase 2.1 (CLAUDE.md annex)

---

## Goal

Give new self-hosted GhostBot owners a guided 5-step onboarding flow that gets them from "fresh install" to "working chat + agents" without having to find their way through 16 admin pages. Reduce time-to-first-chat; reduce drop-off from unfinished config.

## Non-goals

- Per-user wizards for invited users (they inherit owner's config)
- Language selector UI (translation plumbing only; hardcode `en`)
- Extracting existing hardcoded strings app-wide (scope discipline)
- End-to-end Playwright tests (deferred to Phase 3.1)
- Detailed Docker mount documentation content (stub link only; Phase 2.3)

## Success criteria

- Fresh-install owner reaches their first chat with a working LLM in under 2 minutes of clicking
- Existing installs with full config can finish the wizard in a single click (banner → all-green → Complete)
- `/setup` accurately reflects current config at any time, regardless of whether config was set via the wizard or via admin pages
- No new `src/lib/db/schema.js` columns required — no migration risk

---

## 1. Architecture & routing

**New route:** `src/app/setup/page.js` — single page, admin-only, owner-only.

**Middleware** ([src/middleware.js](src/middleware.js)):
- Add `/setup` alongside `/admin` in the admin-protected branch
- Add a **first-visit redirect**: if the logged-in user is the owner AND `settings.setupWizardFirstShownAt` is null AND the pathname is not already `/setup`, redirect to `/setup`. Stamp `setupWizardFirstShownAt = now` on that first GET so the redirect fires exactly once per install.

**Component split:**

| File | Role |
|---|---|
| `src/app/setup/page.js` | Server Component. Reads current config from the settings/config layer, computes per-step "done-ness", passes initial state to the client component. |
| `src/app/setup/setup-client.jsx` | Client Component. Owns the single-scroll state machine — which step is active, which are locked, which are complete. Renders the five step components. |
| `src/app/setup/steps/StepLlm.jsx` | LLM provider form + Active card. |
| `src/app/setup/steps/StepDocker.jsx` | Docker check result + acknowledge-skip. |
| `src/app/setup/steps/StepGithub.jsx` | PAT form + Active card. |
| `src/app/setup/steps/StepNotifications.jsx` | Telegram + Slack sub-sections. |
| `src/app/setup/steps/StepDone.jsx` | Summary + Complete buttons. |
| `src/lib/admin/setup-actions.js` | Server actions: `saveLlm`, `testLlm`, `checkDocker`, `saveGithubPat`, `testGithubPat`, `saveTelegram`, `saveSlack`, `markWizardComplete`, `dismissBanner`. Thin wrappers over existing config/secret helpers, returning `{ ok, message, details }`. |

**Admin-panel re-entry:** A "Setup wizard" link in the admin sidebar under a Getting Started section (or a pinned card on `/admin` index). Opens `/setup` without triggering the first-run redirect logic.

## 2. Data model

No new table. Reuse the existing `settings` key/value store ([src/lib/db/schema.js:114](src/lib/db/schema.js:114)) with three new keys under `type = 'setup_wizard'`:

| Key | Value | Set when |
|---|---|---|
| `setupWizardFirstShownAt` | ms timestamp | Middleware redirects owner to `/setup` for the first time |
| `setupWizardCompletedAt` | ms timestamp | Owner reaches Step 5 and clicks a completion CTA, or clicks "Mark as complete" explicitly |
| `setupWizardBannerDismissedAt` | ms timestamp | Owner clicks the X on the "Finish setup" banner |

### Step done-ness is inferred, not stored

On each page load, the server component computes per-step status from live config:

| Step | Considered "done" when |
|---|---|
| LLM | `LLM_PROVIDER` set AND most recent `<provider>LastTestOk = true` in settings |
| Docker | `/var/run/docker.sock` reachable via `src/lib/tools/docker.js` ping (checked on page load) |
| GitHub | Encrypted `GH_TOKEN` present AND most recent `githubLastTestOk = true` in settings |
| Notifications | Telegram bot token OR Slack webhook URL present (either counts as done; both optional) |
| Done | `setupWizardCompletedAt` not null |

This means configuring providers via the regular admin pages automatically marks wizard steps green on next open — single source of truth.

### Secrets handling on re-run

Each secret field uses `<input placeholder="Already configured ✓" />` when the underlying config exists. Empty submit = leave existing value untouched. Non-empty submit = overwrite via `setConfigSecret`. Never echo stored secrets back to the client.

### Implementation note on `<provider>LastTestOk` flags

If any existing admin page does not already persist a `lastTestOk` flag in settings when its test button succeeds, add that one small write to the existing admin action as part of this project. Do not create parallel test logic — share the test function with the admin page. Verify flag presence per provider during implementation before adding settings keys unilaterally.

## 3. The five steps

### Step 1 — LLM Provider (required, blocking live-test)

**Form fields:**
- Provider select: Ollama / Anthropic / OpenAI / Google
- Ollama: `baseUrl`, optional `model` (defaults to first available)
- Anthropic / OpenAI / Google: `apiKey`, optional `model`

**Flow:** Click **Test & Save** → server action calls the existing provider validator (cloud: list models; Ollama: `GET /api/tags`) → on success, persist via `setConfig` / `setConfigSecret`, set `<provider>LastTestOk = true`, flip step into Active card. On failure, inline error, nothing stored.

**Blocking:** Steps 2+ stay collapsed and visually dimmed until Step 1 is Active. No skip.

**Active card contents:** provider name; base URL or masked key (`sk-••••1a2b`); resolved model; two buttons: `Re-test`, `Disconnect`.

### Step 2 — Docker check (skippable with acknowledgement)

No form. On step mount, calls `checkDocker()` server action — pings the socket via `src/lib/tools/docker.js`.

Three states:
- **✓ Reachable** → green Active card showing socket path, Docker engine version, and the list of detected `ghostbot:coding-agent-*` images. Auto-scrolls to Step 3 after 1 second.
- **✗ Socket missing** → red warning card: "Docker socket not mounted. Coding agents won't work." Link to `/docs#docker-mount` (stub for Phase 2.3). Buttons: `Re-check`, `Skip anyway — I'll set this up later`.
- **⚠ Socket reachable but no agent images** → amber warning with `Pull default images` button that triggers `docker pull ghostbot:coding-agent-aider` via the existing docker helper.

When acknowledged-skip, step shows a muted grey card "Skipped — agents disabled. Re-run wizard to configure."

### Step 3 — GitHub PAT (skippable, non-blocking test)

**Form fields:**
- `githubPat` — password input; placeholder `Already configured ✓` on re-run
- Info block listing required scopes (`repo`, `read:user`, `workflow`) and a link to GitHub's fine-grained PAT page

**Flow:** `Test & Save` → `GET https://api.github.com/user` with the PAT. Success: Active card with `@username` and detected scopes. Failure: inline error, but **does not block**; owner can Skip or retry.

**Active card contents:** masked token (`ghp_••••abcd`), GitHub username, detected scopes, `Disconnect`.

### Step 4 — Notifications (skippable, non-blocking test)

Two sub-sections, side-by-side on desktop, stacked under 640px:

**Telegram:** `botToken` (password) + `chatId` + "Send test message" button.

**Slack:** `webhookUrl` (password) + "Send test message" button.

Either, both, or neither. `Save & Test` on each sub-section is independent. Active state shows a small green badge ("Telegram active" / "Slack active") with its own `Disconnect` button.

### Step 5 — Done

Summary card enumerating configured vs skipped items:

```
✓ LLM: Ollama (qwen2.5-coder:32b)
✓ Docker: Connected, 4 agent images
⚠ GitHub: Skipped — coding agents won't be able to push PRs
⚠ Telegram: Skipped
✓ Slack: Webhook configured
```

Two CTAs:
- **Primary (gold)** — `Start using GhostBot →` — calls `markWizardComplete()` (sets `setupWizardCompletedAt = now`) and redirects to `/` (owner's first chat).
- **Secondary (ghost)** — `Back to admin` — same completion write, redirects to `/admin`.

If any step is still warning/skipped, confirm dialog: "Some features are disabled. You can re-run setup from Admin → Setup at any time. Finish anyway?"

## 4. Banner and re-entry

### "Finish setup" banner

**Shown when:** `setupWizardCompletedAt` is null AND `setupWizardBannerDismissedAt` is null AND the logged-in user is the owner.

**Placement:** A 36px strip below the top navbar on every page except `/setup`. Brand tokens: `#111827` background, `#D4AF37` gold left border, `#F5D97A` text.

**Content:**
```
⚙ Finish your GhostBot setup — LLM: ✓  Docker: ⚠  GitHub: ○          [Resume] [✕]
```

- `Resume` → navigates to `/setup`
- `✕` → calls `dismissBanner()` (sets `setupWizardBannerDismissedAt = now`), banner disappears permanently
- Inline status pips reflect live inferred done-ness

Dismissal is permanent by design — less nagging, still re-openable from the admin panel.

### Three ways to reach /setup

1. First-run redirect (middleware, once per install)
2. Banner `Resume` button (until dismissed)
3. Admin sidebar → Setup wizard link, or `/admin` index card (always available)

All three hit the same page; the page recomputes state on every load.

## 5. Edge cases

| Case | Handling |
|---|---|
| Non-owner admin visits `/setup` | Redirect to `/admin` — wizard is owner-only |
| Regular user visits `/setup` | Existing middleware bounces non-admins; no change |
| Owner logs out mid-wizard | Nothing lost — each step persists on save. Next login shows the banner (not another forced redirect) once the first-visit flag is set. |
| Admin configures LLM through `/admin/llm-providers` instead of wizard | Wizard's inferred done-ness picks it up — opening `/setup` later shows Step 1 green |
| Admin deletes an agent image or revokes PAT after completion | Wizard's inferred state flips back to warning if re-opened; banner does NOT auto-reappear (dismissal is permanent) |
| Fresh install, no owner yet | First signup creates owner; existing signup flow logs them in; middleware redirect fires on next page load |
| `settings` table nuked manually | `setupWizardFirstShownAt` goes back to null; wizard re-triggers as if fresh install. Acceptable. |
| Mobile (under 640px) | Single-scroll layout stacks naturally; Telegram/Slack sub-sections stack vertically; forms single-column |

## 6. Translation plumbing

Project convention: **no i18n libraries.** Plain JSON locales files + a minimal in-repo helper.

**Files created by this project:**
- `src/locales/en.json` — fully populated with every wizard string (plus `setup.banner.*`)
- `src/locales/nl.json`, `src/locales/fr.json` — copies of `en.json` as predictable fallback structure
- `src/lib/i18n.js` — ~15-line `t(key, vars)` helper supporting dotted keys, `{var}` interpolation, fallback to `en.json` on missing key. Exports `ACTIVE_LOCALE = 'en'` (hardcoded for this phase).

**JSON shape:**
```json
{
  "setup": {
    "banner": { "title": "Finish your GhostBot setup", "resume": "Resume", "dismiss": "Dismiss" },
    "llm":    { "title": "Choose your LLM provider", "testAndSave": "Test & Save", "disconnect": "Disconnect & edit", ... },
    "docker": { ... },
    "github": { ... },
    "notifications": { ... },
    "done":   { ... }
  }
}
```

**Scope:** only the new wizard + banner strings go through `t()` in this project. Existing admin-page strings remain hardcoded; they will migrate incrementally when those pages are touched for unrelated reasons.

**Explicitly forbidden:** `next-intl`, `react-i18next`, `lingui`, `@formatjs/*`. If the translation helper ever grows beyond ~50 lines, re-open this decision; do not silently install a library.

## 7. Testing

| Layer | Test | Tool | In scope here? |
|---|---|---|---|
| `src/lib/i18n.js` | Returns string for known key; falls back to `en.json` on miss; `{var}` interpolation works | Vitest | ✅ |
| `src/lib/admin/setup-actions.js` | `checkDocker()` → `{ ok: false }` when socket missing; `testLlm('ollama', badUrl)` → error shape | Vitest, mock fetch / docker helper | ✅ |
| `/setup` page flow | Owner redirected on first visit; non-owner bounced; banner shows/dismisses; re-run pre-fills | Playwright | ❌ deferred to Phase 3.1 |
| Manual | Walk through all 5 steps on a clean install; reload mid-flow; re-run from admin panel | Checklist below | ✅ |

### Manual QA checklist

- [ ] Fresh install: first login as owner redirects to `/setup`
- [ ] Step 1 blocks progression until Test & Save succeeds
- [ ] Step 2 shows red warning when socket missing; acknowledged skip lets progression continue
- [ ] Step 3 PAT test works, errors surface inline, skip works
- [ ] Step 4 Telegram + Slack test messages arrive
- [ ] Step 5 Complete button writes `setupWizardCompletedAt` and redirects
- [ ] Banner appears on pages other than `/setup` until complete or dismissed
- [ ] Banner X persists dismissal across reload
- [ ] Re-open from admin panel shows pre-filled non-secret fields, `Already configured ✓` for secrets
- [ ] Non-owner admin visiting `/setup` gets redirected to `/admin`
- [ ] Second login after first-visit redirect does NOT re-force the redirect

## 8. Rollout

Feature branch `setup-wizard`, merged as a whole. No feature flag.

Zero-downtime migration: no schema changes. New settings rows written lazily by the wizard server actions. No edit to `runAutoMigrations`.

**Existing-install behavior on first deploy:**
- Owner logs in → middleware redirects to `/setup` (first-visit flag was never set)
- All five steps appear green (inferred done-ness from existing config)
- Owner clicks "Start using GhostBot →" — `setupWizardCompletedAt` written
- Total friction: one click

## 9. Open questions / flagged risks

- **Risk:** If any provider's admin page does not already persist `lastTestOk`, the wizard's inferred done-ness for that provider will be wrong on re-open. Mitigation: verify each provider during implementation; add the flag write to the shared test function if missing.
- **Risk:** `docker pull` from the wizard can be slow (500MB+ image, several minutes). Mitigation: show a progress indicator and let the owner skip if they don't want to wait. Do not block the wizard on pull completion.
- **Deferred:** Language selector UI. The plumbing ships but there is no visible way to switch locales. That's a deliberate follow-up, not a bug.
