'use server';

import { auth } from '../auth/config.js';
import {
  createSkill,
  getSkillBySlug,
  listSkillsByUser,
  updateSkill,
  deleteSkill,
} from './db.js';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function createSkillAction({ name, slug, description, promptTemplate, modelPreference }) {
  const session = await requireAuth();
  return createSkill({
    userId: session.user.id,
    name,
    slug,
    description,
    promptTemplate,
    modelPreference: modelPreference || null,
  });
}

export async function listSkillsAction() {
  const session = await requireAuth();
  return listSkillsByUser(session.user.id);
}

export async function updateSkillAction(id, updates) {
  await requireAuth();
  updateSkill(id, updates);
  return { success: true };
}

export async function deleteSkillAction(id) {
  await requireAuth();
  deleteSkill(id);
  return { success: true };
}
