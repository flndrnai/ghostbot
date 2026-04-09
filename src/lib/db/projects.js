import { eq, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import { projects } from './schema.js';
import { PROJECT_ROOT } from '../paths.js';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(PROJECT_ROOT, 'data', 'projects');

const CLAUDE_MD_TEMPLATE = (name) => `# ${name}

## Architecture
(describe your project structure here)

## Tech Stack
(frameworks, languages, tools)

## Conventions
(coding conventions, patterns, naming rules)

## What's Shipped
(features and modules that are complete)

## What's In Progress
(current work)

## What's Parked
(deferred items and why)
`;

export function createProject({ userId, name, description = '' }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const projectPath = path.join('data', 'projects', id);
  const fullPath = path.join(PROJECT_ROOT, projectPath);
  const now = Date.now();

  // Create folder + CLAUDE.md
  fs.mkdirSync(fullPath, { recursive: true });
  fs.writeFileSync(path.join(fullPath, 'CLAUDE.md'), CLAUDE_MD_TEMPLATE(name), 'utf-8');

  db.insert(projects)
    .values({ id, userId, name, path: projectPath, description, createdAt: now, updatedAt: now })
    .run();

  return { id, path: projectPath };
}

export function getProjectById(id) {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function getProjectsByUser(userId) {
  const db = getDb();
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))
    .all();
}

export function updateProject(id, data) {
  const db = getDb();
  db.update(projects)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(projects.id, id))
    .run();
}

export function deleteProject(id) {
  const db = getDb();
  // Only delete DB row — files are preserved for safety
  db.delete(projects).where(eq(projects.id, id)).run();
}

/** Resolve a project path to its absolute location on disk. */
export function resolveProjectPath(projectPath) {
  return path.join(PROJECT_ROOT, projectPath);
}
