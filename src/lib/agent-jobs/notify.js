// Telegram notifications for agent-job lifecycle events.
// Hooks into updateAgentJob transitions: emits a "started" ping
// when running, a "done" ping on success/failure.
//
// All sends are fire-and-forget; Telegram outages never block
// the job itself.

import { getConfig } from '../config.js';
import { getConfigSecret } from '../db/config.js';
import { sendMessage } from '../tools/telegram.js';
import { slackPostMessage } from '../tools/slack.js';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function notifyAgentJob(event, job) {
  if (!job) return;
  const promptPreview = (job.prompt || '').slice(0, 180);
  // Fan out to every configured channel; each wrapped in its own try.
  await Promise.allSettled([
    notifyTelegram(event, job, promptPreview),
    notifySlack(event, job, promptPreview),
  ]);
}

async function notifyTelegram(event, job, promptPreview) {
  try {
    const token = getConfigSecret('TELEGRAM_BOT_TOKEN');
    const chatId = getConfig('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const base = `<b>GhostBot Agent</b> · <i>${escapeHtml(job.agent || 'agent')}</i>`;
    let text = '';
    if (event === 'started') {
      text =
        `${base}\n\n` +
        `🟡 <b>Started</b>\n` +
        `<code>${escapeHtml(job.repo)}</code> → <code>${escapeHtml(job.branch)}</code>\n\n` +
        `${escapeHtml(promptPreview)}`;
    } else if (event === 'succeeded') {
      text =
        `${base}\n\n` +
        `✅ <b>Done</b>\n` +
        `<code>${escapeHtml(job.repo)}</code> → <code>${escapeHtml(job.branch)}</code>\n\n` +
        `${escapeHtml(promptPreview)}` +
        (job.prUrl ? `\n\n<a href="${escapeHtml(job.prUrl)}">Open PR</a>` : '');
    } else if (event === 'failed') {
      text =
        `${base}\n\n` +
        `❌ <b>Failed</b>\n` +
        `<code>${escapeHtml(job.repo)}</code> → <code>${escapeHtml(job.branch)}</code>\n\n` +
        `${escapeHtml(promptPreview)}\n\n` +
        `<b>Error:</b> ${escapeHtml((job.error || 'unknown').slice(0, 300))}`;
    } else {
      return;
    }

    await sendMessage(token, chatId, text, { parse_mode: 'HTML', disable_web_page_preview: false });
  } catch (err) {
    console.error('[telegram notify] failed:', err?.message || err);
  }
}

async function notifySlack(event, job, promptPreview) {
  try {
    const token = getConfigSecret('SLACK_BOT_TOKEN');
    const channel = getConfig('SLACK_CHANNEL');
    if (!token || !channel) return;

    // Slack uses mrkdwn (single-star bold, single-tick code, <url|label>)
    const agent = job.agent || 'agent';
    let text = '';
    if (event === 'started') {
      text = `:hourglass_flowing_sand: *GhostBot Agent* (${agent}) *started*\n\`${job.repo}\` → \`${job.branch}\`\n\n>${promptPreview}`;
    } else if (event === 'succeeded') {
      text = `:white_check_mark: *GhostBot Agent* (${agent}) *done*\n\`${job.repo}\` → \`${job.branch}\`\n\n>${promptPreview}`;
      if (job.prUrl) text += `\n\n<${job.prUrl}|Open PR>`;
    } else if (event === 'failed') {
      text = `:x: *GhostBot Agent* (${agent}) *failed*\n\`${job.repo}\` → \`${job.branch}\`\n\n>${promptPreview}\n\n*Error:* ${(job.error || 'unknown').slice(0, 300)}`;
    } else {
      return;
    }

    await slackPostMessage(token, channel, text);
  } catch (err) {
    console.error('[slack notify] failed:', err?.message || err);
  }
}
