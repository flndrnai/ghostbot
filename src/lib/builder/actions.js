'use server';

import { auth } from '../auth/config.js';
import {
  createPlan,
  getPlanById,
  getPlansByProject,
  getPlansByUser,
  updatePlan,
  deletePlan,
  createStep,
  getStepsByPlan,
  updateStep,
} from './db.js';
import { generateBuildPlan } from './planner.js';
import { runBuilderPlan } from './runner.js';
import { getProjectById, resolveProjectPath } from '../db/projects.js';
import fs from 'fs';
import path from 'path';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

/**
 * Create a new build plan for a project.
 * Generates steps via LLM, saves to DB, returns planId.
 */
export async function createBuilderPlanAction(projectId, goal) {
  const session = await requireAuth();
  const project = getProjectById(projectId);
  if (!project || project.userId !== session.user.id) {
    return { error: 'Project not found' };
  }

  // Read project context
  const projectPath = resolveProjectPath(project.path);
  let claudeMd = '';
  let fileTree = '';
  try {
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      claudeMd = fs.readFileSync(claudeMdPath, 'utf-8').slice(0, 8000);
    }
  } catch {}
  try {
    const { listFiles } = await import('../projects/files.js');
    const tree = listFiles(projectPath);
    fileTree = flattenTree(tree).join('\n');
  } catch {}

  // Generate the plan via LLM
  let steps;
  try {
    steps = await generateBuildPlan(goal, claudeMd, fileTree);
  } catch (err) {
    return { error: err.message };
  }

  // Create plan + steps in DB
  const { id: planId } = createPlan({
    projectId,
    userId: session.user.id,
    goal,
  });

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    createStep({
      planId,
      stepNumber: i + 1,
      title: s.title,
      prompt: s.prompt,
    });
  }

  updatePlan(planId, { status: 'planned' });

  return { planId, stepCount: steps.length };
}

/**
 * Start executing a planned build.
 */
export async function startBuilderPlanAction(planId) {
  const session = await requireAuth();
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) return { error: 'Plan not found' };
  if (plan.status === 'running') return { error: 'Plan is already running' };

  // Fire-and-forget
  runBuilderPlan(planId).catch((err) => {
    console.error('[builder] plan execution failed:', err);
    updatePlan(planId, { status: 'failed' });
  });

  return { success: true };
}

/**
 * Pause a running build.
 */
export async function pauseBuilderPlanAction(planId) {
  const session = await requireAuth();
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) return { error: 'Plan not found' };
  updatePlan(planId, { status: 'paused' });
  return { success: true };
}

/**
 * Resume a paused build.
 */
export async function resumeBuilderPlanAction(planId) {
  const session = await requireAuth();
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) return { error: 'Plan not found' };

  // Reset pending steps and re-run
  runBuilderPlan(planId).catch((err) => {
    console.error('[builder] plan resume failed:', err);
    updatePlan(planId, { status: 'failed' });
  });

  return { success: true };
}

/**
 * Retry a failed step (resets it and re-runs the plan from that point).
 */
export async function retryBuilderStepAction(stepId) {
  const session = await requireAuth();
  // Find the step and its plan
  const { getDb } = await import('../db/index.js');
  const { builderSteps } = await import('../db/schema.js');
  const { eq } = await import('drizzle-orm');
  const db = getDb();
  const step = db.select().from(builderSteps).where(eq(builderSteps.id, stepId)).get();
  if (!step) return { error: 'Step not found' };

  const plan = getPlanById(step.planId);
  if (!plan || plan.userId !== session.user.id) return { error: 'Plan not found' };

  // Reset this step and all subsequent
  const steps = getStepsByPlan(plan.id);
  for (const s of steps) {
    if (s.stepNumber >= step.stepNumber) {
      updateStep(s.id, { status: 'pending', jobId: null, output: null, retryCount: 0 });
    }
  }

  // Re-run from this point
  runBuilderPlan(plan.id).catch((err) => {
    console.error('[builder] retry failed:', err);
    updatePlan(plan.id, { status: 'failed' });
  });

  return { success: true };
}

/**
 * Get a plan with its steps.
 */
export async function getBuilderPlanAction(planId) {
  const session = await requireAuth();
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) return null;
  const steps = getStepsByPlan(planId);
  return { ...plan, steps };
}

/**
 * List plans for a project or all user plans.
 */
export async function listBuilderPlansAction(projectId = null) {
  const session = await requireAuth();
  if (projectId) {
    return getPlansByProject(projectId);
  }
  return getPlansByUser(session.user.id);
}

/**
 * Delete a plan and all its steps.
 */
export async function deleteBuilderPlanAction(planId) {
  const session = await requireAuth();
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) return { error: 'Plan not found' };
  deletePlan(planId);
  return { success: true };
}

// Helper: flatten tree (same as in ai/index.js)
function flattenTree(nodes, prefix = '', result = []) {
  for (const node of nodes) {
    if (node.type === 'dir') {
      result.push(`${prefix}${node.name}/`);
      if (node.children) flattenTree(node.children, prefix + '  ', result);
    } else {
      const size = node.size > 1024 ? `${(node.size / 1024).toFixed(1)}K` : `${node.size}B`;
      result.push(`${prefix}${node.name} (${size})`);
    }
    if (result.length > 200) break;
  }
  return result;
}
