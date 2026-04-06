const TELEGRAM_API = 'https://api.telegram.org';

export async function sendMessage(botToken, chatId, text, options = {}) {
  const chunks = smartSplit(text, 4096);

  for (const chunk of chunks) {
    const html = markdownToTelegramHtml(chunk);
    await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        ...options,
      }),
    });
  }
}

export async function sendReaction(botToken, chatId, messageId, emoji = '👍') {
  await fetch(`${TELEGRAM_API}/bot${botToken}/setMessageReaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: 'emoji', emoji }],
    }),
  }).catch(() => {});
}

export async function sendTypingAction(botToken, chatId) {
  await fetch(`${TELEGRAM_API}/bot${botToken}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {});
}

export async function downloadFile(botToken, fileId) {
  const fileRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  const fileData = await fileRes.json();
  if (!fileData.ok || !fileData.result?.file_path) return null;

  const downloadRes = await fetch(`${TELEGRAM_API}/file/bot${botToken}/${fileData.result.file_path}`);
  return Buffer.from(await downloadRes.arrayBuffer());
}

export async function registerWebhook(botToken, webhookUrl, secret) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'edited_message'],
    }),
  });
  return res.json();
}

/**
 * Split text at natural boundaries to fit Telegram's 4096 char limit.
 */
export function smartSplit(text, maxLength = 4096) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const delimiters = ['\n\n', '\n', '. ', ' '];
    let splitAt = -1;

    for (const delim of delimiters) {
      const idx = remaining.lastIndexOf(delim, maxLength);
      if (idx > maxLength * 0.3) {
        splitAt = idx + delim.length;
        break;
      }
    }

    if (splitAt === -1) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

/**
 * Convert markdown to Telegram HTML.
 * Protects code blocks, converts bold/italic/code/links.
 */
export function markdownToTelegramHtml(text) {
  const placeholders = [];
  let result = text;

  // Protect code blocks
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const idx = placeholders.length;
    const code = match.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    placeholders.push(`<pre>${escapeHtml(code)}</pre>`);
    return `__PH${idx}__`;
  });

  // Protect inline code
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    const idx = placeholders.length;
    placeholders.push(`<code>${escapeHtml(code)}</code>`);
    return `__PH${idx}__`;
  });

  // Escape remaining HTML
  result = result.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  // Convert markdown
  result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  result = result.replace(/\*(.+?)\*/g, '<i>$1</i>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Restore placeholders
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(`__PH${i}__`, placeholders[i]);
  }

  return result;
}

function escapeHtml(str) {
  return str.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
