// Skills — reusable prompt templates invocable from chat via /skill-name

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { skills } from '../db/schema.js';

export function createSkill({ userId, name, slug, description = '', promptTemplate, modelPreference = null }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();

  // Normalize slug: lowercase, alphanumeric + hyphens only
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  db.insert(skills)
    .values({
      id,
      userId,
      name,
      slug: cleanSlug,
      description,
      promptTemplate,
      modelPreference,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, slug: cleanSlug };
}

export function getSkillBySlug(slug, userId = null) {
  const db = getDb();
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (userId) {
    return db.select().from(skills)
      .where(and(eq(skills.slug, cleanSlug), eq(skills.userId, userId)))
      .get();
  }
  return db.select().from(skills).where(eq(skills.slug, cleanSlug)).get();
}

export function listSkillsByUser(userId) {
  const db = getDb();
  return db.select().from(skills)
    .where(eq(skills.userId, userId))
    .orderBy(desc(skills.createdAt))
    .all();
}

export function updateSkill(id, updates, userId) {
  const db = getDb();
  const fields = { ...updates, updatedAt: Date.now() };
  if (fields.slug) {
    fields.slug = fields.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  // Ownership is enforced at the DB layer — rows are updated only if
  // both the id AND the userId match. Foreign skills are untouched.
  const where = userId
    ? and(eq(skills.id, id), eq(skills.userId, userId))
    : eq(skills.id, id);
  db.update(skills).set(fields).where(where).run();
}

export function deleteSkill(id, userId) {
  const db = getDb();
  const where = userId
    ? and(eq(skills.id, id), eq(skills.userId, userId))
    : eq(skills.id, id);
  db.delete(skills).where(where).run();
}
