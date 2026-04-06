import { eq, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import { codeWorkspaces } from './schema.js';

export function createCodeWorkspace({ userId, containerName, repo, branch, featureBranch, title = 'Code Workspace' }) {
  const db = getDb();
  const now = Date.now();
  const id = crypto.randomUUID();

  db.insert(codeWorkspaces)
    .values({
      id,
      userId,
      containerName,
      repo,
      branch,
      featureBranch,
      title,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id };
}

export function getCodeWorkspaceById(id) {
  const db = getDb();
  return db.select().from(codeWorkspaces).where(eq(codeWorkspaces.id, id)).get();
}

export function getCodeWorkspacesByUser(userId) {
  const db = getDb();
  return db
    .select()
    .from(codeWorkspaces)
    .where(eq(codeWorkspaces.userId, userId))
    .orderBy(desc(codeWorkspaces.updatedAt))
    .all();
}

export function updateCodeWorkspace(id, data) {
  const db = getDb();
  db.update(codeWorkspaces)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(codeWorkspaces.id, id))
    .run();
}

export function deleteCodeWorkspace(id) {
  const db = getDb();
  db.delete(codeWorkspaces).where(eq(codeWorkspaces.id, id)).run();
}
