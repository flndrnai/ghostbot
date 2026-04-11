// Builder DB — CRUD for builder_plans and builder_steps

import { eq, and, desc, asc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { builderPlans, builderSteps } from '../db/schema.js';

// ─── Plans ──────────────────────────────────────────────────

export function createPlan({ projectId, userId, goal }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.insert(builderPlans)
    .values({ id, projectId, userId, goal, status: 'planning', createdAt: now, updatedAt: now })
    .run();
  return { id };
}

export function getPlanById(id) {
  const db = getDb();
  return db.select().from(builderPlans).where(eq(builderPlans.id, id)).get();
}

export function getPlansByProject(projectId) {
  const db = getDb();
  return db.select().from(builderPlans)
    .where(eq(builderPlans.projectId, projectId))
    .orderBy(desc(builderPlans.createdAt))
    .all();
}

export function getPlansByUser(userId) {
  const db = getDb();
  return db.select().from(builderPlans)
    .where(eq(builderPlans.userId, userId))
    .orderBy(desc(builderPlans.createdAt))
    .all();
}

export function updatePlan(id, fields) {
  const db = getDb();
  db.update(builderPlans)
    .set({ ...fields, updatedAt: Date.now() })
    .where(eq(builderPlans.id, id))
    .run();
}

export function deletePlan(id) {
  const db = getDb();
  // Delete steps first
  db.delete(builderSteps).where(eq(builderSteps.planId, id)).run();
  db.delete(builderPlans).where(eq(builderPlans.id, id)).run();
}

// ─── Steps ──────────────────────────────────────────────────

export function createStep({ planId, stepNumber, title, prompt }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.insert(builderSteps)
    .values({
      id, planId, stepNumber, title, prompt,
      status: 'pending', retryCount: 0, maxRetries: 2,
      createdAt: now, updatedAt: now,
    })
    .run();
  return { id };
}

export function getStepsByPlan(planId) {
  const db = getDb();
  return db.select().from(builderSteps)
    .where(eq(builderSteps.planId, planId))
    .orderBy(asc(builderSteps.stepNumber))
    .all();
}

export function updateStep(id, fields) {
  const db = getDb();
  db.update(builderSteps)
    .set({ ...fields, updatedAt: Date.now() })
    .where(eq(builderSteps.id, id))
    .run();
}

export function getStepByJobId(jobId) {
  const db = getDb();
  return db.select().from(builderSteps)
    .where(eq(builderSteps.jobId, jobId))
    .get();
}
