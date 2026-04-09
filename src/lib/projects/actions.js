'use server';

import { auth } from '../auth/config.js';
import {
  createProject,
  getProjectById,
  getProjectsByUser,
  updateProject,
  deleteProject,
} from '../db/projects.js';
import {
  getChatById,
  connectProjectToChat,
  disconnectProjectFromChat,
} from '../db/chats.js';

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Authentication required');
  return session;
}

export async function createProjectAction(name, description = '') {
  const session = await requireUser();
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Name is required');

  return createProject({
    userId: session.user.id,
    name: trimmedName,
    description: (description || '').trim(),
  });
}

export async function listProjectsAction() {
  const session = await requireUser();
  return getProjectsByUser(session.user.id);
}

export async function renameProjectAction(projectId, name) {
  const session = await requireUser();
  const project = getProjectById(projectId);
  if (!project || project.userId !== session.user.id) throw new Error('Not found');

  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Name is required');

  updateProject(projectId, { name: trimmedName });
}

export async function updateProjectDescriptionAction(projectId, description) {
  const session = await requireUser();
  const project = getProjectById(projectId);
  if (!project || project.userId !== session.user.id) throw new Error('Not found');

  updateProject(projectId, { description: (description || '').trim() });
}

export async function deleteProjectAction(projectId) {
  const session = await requireUser();
  const project = getProjectById(projectId);
  if (!project || project.userId !== session.user.id) throw new Error('Not found');

  deleteProject(projectId);
}

export async function connectProjectToChatAction(chatId, projectId) {
  const session = await requireUser();

  const chat = getChatById(chatId);
  if (!chat || chat.userId !== session.user.id) throw new Error('Chat not found');

  const project = getProjectById(projectId);
  if (!project || project.userId !== session.user.id) throw new Error('Project not found');

  connectProjectToChat(chatId, projectId);
}

export async function disconnectProjectFromChatAction(chatId) {
  const session = await requireUser();

  const chat = getChatById(chatId);
  if (!chat || chat.userId !== session.user.id) throw new Error('Chat not found');

  disconnectProjectFromChat(chatId);
}
