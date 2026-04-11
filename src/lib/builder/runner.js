// Builder Runner — Orchestration engine for autonomous builds
// Modeled after cluster chain execution (src/lib/cluster/actions.js)
// Runs steps sequentially, polling agent jobs for completion.

import { eq, and } from 'drizzle-orm';
import { getPlanById, getStepsByPlan, updatePlan, updateStep } from './db.js';
import { validateStep } from './validate.js';
import { publish } from '../sync/bus.js';
import { getProjectById, resolveProjectPath } from '../db/projects.js';
import { getDb } from '../db/index.js';
import { chats } from '../db/schema.js';
import fs from 'fs';
import path from 'path';

const MAX_STEP_WAIT = 30 * 60 * 1000; // 30 min per step
const POLL_INTERVAL = 3000; // 3 seconds

/**
 * Run a complete build plan. Fire-and-forget — runs in background.
 * @param {string} planId
 */
export async function runBuilderPlan(planId) {
  const plan = getPlanById(planId);
  if (!plan) throw new Error('Plan not found');

  const { launchAgentJob } = await import('../agent-jobs/launch.js');
  const { getAgentJob } = await import('../agent-jobs/db.js');

  updatePlan(planId, { status: 'running' });
  publish(plan.userId, { type: 'builder:plan-started', planId });

  const steps = getStepsByPlan(planId);
  let lastOutput = '';

  for (const step of steps) {
    // Check if plan was paused
    const currentPlan = getPlanById(planId);
    if (currentPlan?.status === 'paused') {
      publish(plan.userId, { type: 'builder:plan-paused', planId });
      return;
    }

    // Update step status
    updateStep(step.id, { status: 'running' });
    publish(plan.userId, {
      type: 'builder:step-started',
      planId,
      stepId: step.id,
      stepNumber: step.stepNumber,
      title: step.title,
    });

    // Build the full prompt with context from previous steps
    const contextBlock = lastOutput
      ? `\n\n---\nPrevious step output (use for context):\n${lastOutput.slice(-2000)}`
      : '';
    const fullPrompt = `${step.prompt}${contextBlock}`;

    let jobId;
    try {
      // Find a chat connected to this project to leverage project mount
      const chatId = findProjectChat(plan.projectId, plan.userId);

      jobId = await launchAgentJob({
        chatId,
        userId: plan.userId,
        prompt: fullPrompt,
        agent: 'aider',
        baseBranch: 'main',
      });

      updateStep(step.id, { jobId });
    } catch (err) {
      console.error(`[builder] step ${step.stepNumber} launch failed:`, err?.message);
      updateStep(step.id, { status: 'failed', output: `Launch error: ${err?.message}` });
      publish(plan.userId, {
        type: 'builder:step-failed',
        planId, stepId: step.id, stepNumber: step.stepNumber,
        error: err?.message,
      });
      updatePlan(planId, { status: 'failed' });
      publish(plan.userId, { type: 'builder:plan-failed', planId });
      return;
    }

    // Poll until the job completes
    const start = Date.now();
    let finalJob = null;
    while (Date.now() - start < MAX_STEP_WAIT) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const j = getAgentJob(jobId);
      if (!j) break;
      if (j.status === 'succeeded' || j.status === 'failed') {
        finalJob = j;
        lastOutput = j.output || '';
        break;
      }
    }

    if (!finalJob || finalJob.status === 'failed') {
      const error = finalJob?.error || 'Job timed out or was lost';

      // Retry logic
      if (step.retryCount < step.maxRetries) {
        updateStep(step.id, {
          status: 'pending',
          retryCount: step.retryCount + 1,
          output: `Retry ${step.retryCount + 1}: ${error}`,
        });
        publish(plan.userId, {
          type: 'builder:step-retrying',
          planId, stepId: step.id, stepNumber: step.stepNumber,
          retryCount: step.retryCount + 1,
        });
        // Re-run this step by decrementing the loop
        continue;
      }

      updateStep(step.id, { status: 'failed', output: lastOutput || error });
      publish(plan.userId, {
        type: 'builder:step-failed',
        planId, stepId: step.id, stepNumber: step.stepNumber,
        error,
      });
      updatePlan(planId, { status: 'failed' });
      publish(plan.userId, { type: 'builder:plan-failed', planId });
      return;
    }

    // Validate step
    let validation = { passed: true, checks: [] };
    try {
      const project = getProjectById(plan.projectId);
      if (project) {
        const projectPath = resolveProjectPath(project.path);
        // Store expected files in validation result for the validator
        const expectedFiles = extractExpectedFiles(step);
        if (expectedFiles.length) {
          updateStep(step.id, { validationResult: JSON.stringify({ expectedFiles }) });
        }
        validation = validateStep(
          { ...step, validationResult: JSON.stringify({ expectedFiles }) },
          projectPath
        );
      }
    } catch {}

    // Mark step complete
    updateStep(step.id, {
      status: 'succeeded',
      output: (lastOutput || '').slice(-5000),
      validationResult: JSON.stringify(validation),
    });
    publish(plan.userId, {
      type: 'builder:step-completed',
      planId, stepId: step.id, stepNumber: step.stepNumber,
      validation,
    });
  }

  // All steps complete
  updatePlan(planId, { status: 'completed' });
  publish(plan.userId, { type: 'builder:plan-completed', planId });

  // Update CLAUDE.md with completion
  try {
    updateProjectClaudeMd(plan.projectId, plan.goal);
  } catch {}

  // Notify
  try {
    const { notifyAgentJob } = await import('../agent-jobs/notify.js');
    await notifyAgentJob('succeeded', {
      userId: plan.userId,
      agent: 'builder',
      prompt: plan.goal,
      repo: 'local/project',
      branch: 'builder',
      status: 'succeeded',
    });
  } catch {}
}

/**
 * Find a chat connected to a project (for agent job project mount).
 */
function findProjectChat(projectId, userId) {
  try {
    const db = getDb();
    const chat = db.select().from(chats)
      .where(and(eq(chats.projectId, projectId), eq(chats.userId, userId)))
      .limit(1).all();
    return chat?.[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * Extract expected files from a step's prompt or metadata.
 */
function extractExpectedFiles(step) {
  // The planner stores expectedFiles in the step data, but since we
  // only persist title and prompt, we look for file patterns in the prompt
  try {
    // Check if the step prompt contains a JSON block with expectedFiles
    const match = step.prompt.match(/expectedFiles['":\s]*\[(.*?)\]/s);
    if (match) {
      return JSON.parse(`[${match[1]}]`);
    }
  } catch {}
  return [];
}

/**
 * Update the project's CLAUDE.md after a build completes.
 */
function updateProjectClaudeMd(projectId, goal) {
  const project = getProjectById(projectId);
  if (!project) return;

  const projectPath = resolveProjectPath(project.path);
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  if (!fs.existsSync(claudeMdPath)) return;

  let content = fs.readFileSync(claudeMdPath, 'utf-8');

  // Find "What's Shipped" section and append
  const shippedIdx = content.indexOf("## What's Shipped");
  if (shippedIdx >= 0) {
    const insertPoint = content.indexOf('\n', shippedIdx) + 1;
    const date = new Date().toISOString().split('T')[0];
    const entry = `- [${date}] ${goal.slice(0, 100)}\n`;
    content = content.slice(0, insertPoint) + entry + content.slice(insertPoint);
  } else {
    // Add the section
    const date = new Date().toISOString().split('T')[0];
    content += `\n\n## What's Shipped\n- [${date}] ${goal.slice(0, 100)}\n`;
  }

  // Remove NEW_PROJECT marker if present
  content = content.replace(/NEW_PROJECT/g, '');

  fs.writeFileSync(claudeMdPath, content, 'utf-8');
}
