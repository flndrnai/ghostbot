// Demo-mode gate for the public hosted demo at demo.ghostbot.dev.
//
// When `DEMO_MODE=true` in the env:
// - Agent-job launches are blocked (LLM cost + security).
// - Secret writes (API keys, PATs, webhook secrets) are rejected —
//   we don't want visitor A's Anthropic key persisted for visitor B.
// - Admin-destructive actions (user delete, backup restore) are blocked.
// - A banner shows on every page explaining the restrictions.
//
// Public-facing flag; read on every call so a runtime env change
// (between container restarts) takes effect immediately.

export function isDemoMode() {
  return process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
}

export function requireNotDemo(actionLabel) {
  if (isDemoMode()) {
    const msg = actionLabel
      ? `${actionLabel} is disabled in demo mode`
      : 'This action is disabled in demo mode';
    const err = new Error(msg);
    err.code = 'DEMO_MODE_BLOCKED';
    throw err;
  }
}

// For client-side feature gates / banners — available as a plain
// function the UI can call without imports from the server layer.
// If you add new demo-mode gates that should surface a user message,
// thread them through here.
export const DEMO_MESSAGE = 'Demo mode — agent jobs, secret saves, and destructive actions are disabled. DB resets every 24h.';
