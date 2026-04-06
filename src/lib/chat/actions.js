'use server';

import { auth } from '../auth/config.js';
import {
  getChatById,
  updateChatTitle,
  deleteChat,
  toggleChatStarred,
} from '../db/chats.js';

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
