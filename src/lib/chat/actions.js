'use server';

import { auth } from '../auth/config.js';
import {
  getChatById,
  updateChatTitle,
  deleteChat,
  toggleChatStarred,
  toggleChatMemory,
  getMessagesByChatId,
} from '../db/chats.js';
import { formatDateTime } from '../date-format.js';

async function requireChatOwner(chatId) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const chat = getChatById(chatId);
  if (!chat) throw new Error('Chat not found');
  if (chat.userId !== session.user.id) throw new Error('Forbidden');

  return { session, chat };
}

export async function renameChatAction(chatId, title) {
  await requireChatOwner(chatId);

  if (!title?.trim()) return { error: 'Title is required' };
  updateChatTitle(chatId, title.trim());
  return { success: true };
}

export async function deleteChatAction(chatId) {
  await requireChatOwner(chatId);

  deleteChat(chatId);
  return { success: true };
}

export async function toggleStarAction(chatId) {
  await requireChatOwner(chatId);

  toggleChatStarred(chatId);
  return { success: true };
}

export async function toggleChatMemoryAction(chatId) {
  await requireChatOwner(chatId);
  const memoryEnabled = toggleChatMemory(chatId);
  return { success: true, memoryEnabled };
}

export async function exportChatMarkdown(chatId) {
  const { chat } = await requireChatOwner(chatId);
  const rawMessages = getMessagesByChatId(chatId) || [];

  const lines = [];
  lines.push(`# ${chat.title || 'GhostBot Chat'}`);
  lines.push('');
  const created = chat.createdAt ? formatDateTime(chat.createdAt) : '';
  if (created) lines.push(`*Exported ${formatDateTime(Date.now())} \u2014 originally created ${created}*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const m of rawMessages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const ts = m.createdAt ? formatDateTime(m.createdAt) : '';
    const who = m.role === 'user' ? '👤 **You**' : '👻 **GhostBot**';
    lines.push(`### ${who}${ts ? `  \u00B7 *${ts}*` : ''}`);
    lines.push('');
    lines.push(m.content || '');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return {
    filename: `ghostbot-chat-${chat.title ? chat.title.replace(/[^a-z0-9\-_ ]/gi, '').trim().slice(0, 40).replace(/\s+/g, '-') : chat.id.slice(0, 8)}.md`,
    content: lines.join('\n'),
  };
}
