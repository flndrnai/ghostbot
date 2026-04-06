'use server';

import { auth } from '../auth/config.js';
import { getConfig } from '../config.js';
import {
  createCodeWorkspace as dbCreateCodeWorkspace,
  getCodeWorkspaceById,
  getCodeWorkspacesByUser,
  deleteCodeWorkspace as dbDeleteCodeWorkspace,
} from '../db/code-workspaces.js';
import { runInteractiveContainer, inspectContainer, startContainer, removeContainer } from '../tools/docker.js';
import { addSession, getNextPort, clearWorkspaceSessions } from './terminal-sessions.js';

export async function getCodeWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return getCodeWorkspacesByUser(session.user.id);
}

export async function createWorkspace({ repo, branch, title }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const workspaceId = crypto.randomUUID();
  const shortId = workspaceId.replace(/-/g, '').slice(0, 8);
  const agent = getConfig('CODING_AGENT') || 'claude-code';
  const containerName = `ghostbot-${agent}-interactive-${shortId}`;

  // Create DB record
  const { id } = dbCreateCodeWorkspace({
    userId: session.user.id,
    containerName,
    repo,
    branch,
    title: title || `${repo} (${branch})`,
  });

  // Launch interactive container
  try {
    await runInteractiveContainer({
      containerName,
      repo,
      branch,
      workspaceId: id,
    });
  } catch (error) {
    // Cleanup DB if container fails
    dbDeleteCodeWorkspace(id);
    throw new Error(`Failed to create workspace: ${error.message}`);
  }

  return { id, containerName };
}

export async function ensureWorkspaceContainer(workspaceId) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const workspace = getCodeWorkspaceById(workspaceId);
  if (!workspace || workspace.userId !== session.user.id) throw new Error('Not found');

  const info = await inspectContainer(workspace.containerName);
  if (!info) {
    return { status: 'missing', message: 'Container not found. Recreate the workspace.' };
  }

  const state = info.State?.Status;
  if (state === 'running') return { status: 'running' };

  if (state === 'exited' || state === 'stopped' || state === 'paused') {
    await startContainer(workspace.containerName);
    return { status: 'restarted' };
  }

  return { status: state, message: `Container in unexpected state: ${state}` };
}

export async function deleteWorkspace(workspaceId) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const workspace = getCodeWorkspaceById(workspaceId);
  if (!workspace || workspace.userId !== session.user.id) throw new Error('Not found');

  await removeContainer(workspace.containerName).catch(() => {});
  clearWorkspaceSessions(workspaceId);
  dbDeleteCodeWorkspace(workspaceId);

  return { success: true };
}

export async function createTerminalSession(workspaceId) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const workspace = getCodeWorkspaceById(workspaceId);
  if (!workspace || workspace.userId !== session.user.id) throw new Error('Not found');

  const sessionId = crypto.randomUUID().slice(0, 8);
  const port = getNextPort();

  addSession(workspaceId, sessionId, { port, label: `Shell ${sessionId}` });
  return { sessionId, port };
}
