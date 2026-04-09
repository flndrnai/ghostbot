import { eq, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import { projects } from './schema.js';
import { PROJECT_ROOT } from '../paths.js';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(PROJECT_ROOT, 'data', 'projects');

const CLAUDE_MD_TEMPLATE = (name) => `# ${name}

<!-- NEW_PROJECT: This is a fresh project. The sections below are empty placeholders.
     When the user describes what they want to build, fill in this CLAUDE.md first:
     1. Ask what they want to build if not clear
     2. Fill in Architecture, Tech Stack, and Conventions based on their description
     3. Then start building the project
     Always update this file as the project evolves. -->

## Architecture
(not yet defined — waiting for user instructions)

## Tech Stack
(not yet defined)

## Conventions
(not yet defined)

## What's Shipped
(nothing yet — new project)

## What's In Progress
(nothing yet)

## What's Parked
(nothing yet)
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
