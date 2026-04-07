// Telegram notifications for agent-job lifecycle events.
// Hooks into updateAgentJob transitions: emits a "started" ping
// when running, a "done" ping on success/failure.
//
// All sends are fire-and-forget; Telegram outages never block
// the job itself.

import { getConfig } from '../config.js';
import { getConfigSecret } from '../db/config.js';
import { sendMessage } from '../tools/telegram.js';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function notifyAgentJob(event, job) {
  try {
    const token = getConfigSecret('TELEGRAM_BOT_TOKEN');
    const chatId = getConfig('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return; // not configured
    if (!job) return;

    const promptPreview = (job.prompt || '').slice(0, 180);
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
    console.error('[agent-job notify] failed:', err?.message || err);
  }
}
