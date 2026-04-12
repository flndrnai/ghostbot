import { auth } from '../../../lib/auth/config.js';
import { NextResponse } from 'next/server';
import { createPlan, createStep, updatePlan } from '../../../lib/builder/db.js';
import { generateBuildPlan } from '../../../lib/builder/planner.js';
import { getProjectById, resolveProjectPath } from '../../../lib/db/projects.js';
import fs from 'fs';
import path from 'path';

/** Flatten a file tree into a list of paths */
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

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId, goal } = await request.json();
  if (!projectId || !goal) {
    return NextResponse.json({ error: 'projectId and goal are required' }, { status: 400 });
  }

  const project = getProjectById(projectId);
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
    const { listFiles } = await import('../../../lib/projects/files.js');
    const tree = listFiles(projectPath);
    fileTree = flattenTree(tree).join('\n');
  } catch {}

  // Generate the plan via LLM
  let steps;
  try {
    steps = await generateBuildPlan(goal, claudeMd, fileTree);
  } catch (err) {
    console.error('[builder-api] plan generation failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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

  return NextResponse.json({ planId, stepCount: steps.length });
}
