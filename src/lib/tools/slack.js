// Thin Slack Web API client — only the two endpoints we need:
// chat.postMessage (for notifications) and auth.test (for connection check).
//
// Uses a Slack Bot User OAuth Token (xoxb-...). No SDK dependency.

const SLACK_API = 'https://slack.com/api';

export async function slackPostMessage(botToken, channel, text, blocks = null) {
  if (!botToken || !channel || !text) return null;
  const body = { channel, text };
  if (blocks) body.blocks = blocks;
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(`Slack chat.postMessage failed: ${data.error || res.status}`);
  }
  return data;
}

export async function slackAuthTest(botToken) {
  const res = await fetch(`${SLACK_API}/auth.test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  }
  return {
    ok: true,
    team: data.team,
    user: data.user,
    teamId: data.team_id,
    userId: data.user_id,
  };
}
