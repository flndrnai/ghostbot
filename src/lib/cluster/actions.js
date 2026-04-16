'use server';

import { auth } from '../auth/config.js';
import {
  createCluster as dbCreateCluster,
  getClusterById,
  getClustersByUser,
  updateCluster,
  toggleClusterEnabled,
  toggleClusterStarred,
  deleteCluster as dbDeleteCluster,
  createClusterRole as dbCreateRole,
  getClusterRolesByCluster,
  updateClusterRole,
  deleteClusterRole as dbDeleteRole,
  getRoleWithCluster,
} from '../db/clusters.js';
import { acquireAndRunRole } from './execute.js';
import { reloadClusterRuntime } from './runtime.js';
import { listContainers, removeContainer } from '../tools/docker.js';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

// Fetch the cluster and verify it belongs to the caller. Any mismatch
// surfaces as 'Not found' so that user B cannot probe for existence
// of user A's cluster ids.
async function requireClusterOwner(clusterId) {
  const session = await requireAuth();
  const cluster = getClusterById(clusterId);
  if (!cluster || cluster.userId !== session.user.id) {
    throw new Error('Cluster not found');
  }
  return { session, cluster };
}

async function requireRoleOwner(roleId) {
  const session = await requireAuth();
  const role = getRoleWithCluster(roleId);
  if (!role || role.cluster?.userId !== session.user.id) {
    throw new Error('Role not found');
  }
  return { session, role };
}

// ─── Clusters ───

export async function getClusters() {
  const session = await requireAuth();
  return getClustersByUser(session.user.id);
}

export async function getCluster(clusterId) {
  const session = await requireAuth();
  const cluster = getClusterById(clusterId);
  if (!cluster || cluster.userId !== session.user.id) return null;
  const roles = getClusterRolesByCluster(clusterId);
  return { ...cluster, roles };
}

export async function createClusterAction(name) {
  const session = await requireAuth();
  return dbCreateCluster(session.user.id, { name });
}

export async function listClusterTemplates() {
  await requireAuth();
  const { CLUSTER_TEMPLATES } = await import('./templates.js');
  return CLUSTER_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    roleCount: t.roles.length,
    roles: t.roles.map((r) => ({ roleName: r.roleName, role: r.role })),
  }));
}

export async function createClusterFromTemplateAction(templateId) {
  const session = await requireAuth();
  const { getTemplate } = await import('./templates.js');
  const tpl = getTemplate(templateId);
  if (!tpl) return { error: 'Template not found' };

  // Create the cluster with the template's name + system prompt
  const cluster = dbCreateCluster(session.user.id, {
    name: tpl.name,
    systemPrompt: tpl.systemPrompt,
  });
  const clusterId = cluster.id;

  // Create each role in order
  for (const r of tpl.roles) {
    dbCreateRole(clusterId, {
      roleName: r.roleName,
      role: r.role,
      prompt: r.prompt,
    });
  }

  reloadClusterRuntime();
  return { success: true, clusterId, name: tpl.name, roleCount: tpl.roles.length };
}

export async function renameClusterAction(clusterId, name) {
  await requireClusterOwner(clusterId);
  updateCluster(clusterId, { name });
  return { success: true };
}

export async function toggleClusterAction(clusterId) {
  await requireClusterOwner(clusterId);
  const enabled = toggleClusterEnabled(clusterId);
  reloadClusterRuntime();
  return { enabled };
}

export async function starClusterAction(clusterId) {
  await requireClusterOwner(clusterId);
  const starred = toggleClusterStarred(clusterId);
  return { starred };
}

export async function updateClusterSystemPromptAction(clusterId, systemPrompt) {
  await requireClusterOwner(clusterId);
  updateCluster(clusterId, { systemPrompt });
  return { success: true };
}

export async function deleteClusterAction(clusterId) {
  await requireClusterOwner(clusterId);
  dbDeleteCluster(clusterId);
  reloadClusterRuntime();
  return { success: true };
}

// ─── Run a whole cluster as a chain of agent jobs ───
// Fires one agent job per role, in sortOrder. Each job gets the
// previous role's output appended to its prompt as context.
// Fire-and-forget: returns immediately; the chain continues in
// the background.

export async function runClusterNowAction(clusterId) {
  const session = await requireAuth();
  const cluster = getClusterById(clusterId);
  if (!cluster) return { error: 'Cluster not found' };
  if (cluster.userId !== session.user.id) return { error: 'Not your cluster' };

  const roles = getClusterRolesByCluster(clusterId);
  if (!roles || roles.length === 0) return { error: 'Cluster has no roles' };

  const { launchAgentJob } = await import('../agent-jobs/launch.js');
  const { getAgentJob } = await import('../agent-jobs/db.js');

  // Run sequentially in background so the endpoint returns fast
  (async () => {
    let lastOutput = '';
    for (const role of roles) {
      const contextBlock = lastOutput
        ? `\n\n---\nPrevious role output:\n${lastOutput.slice(-2000)}`
        : '';
      const fullPrompt =
        (cluster.systemPrompt ? `${cluster.systemPrompt}\n\n` : '') +
        `Role: ${role.roleName}\n${role.prompt}${contextBlock}`;

      let jobId;
      try {
        jobId = await launchAgentJob({
          userId: session.user.id,
          prompt: fullPrompt,
          agent: 'aider',
          baseBranch: 'main',
        });
      } catch (err) {
        console.error(`[cluster] role ${role.roleName} launch failed:`, err?.message);
        break;
      }

      // Poll until this job is done before moving to the next role
      const start = Date.now();
      const maxWait = 30 * 60 * 1000; // 30 min cap
      while (Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, 3000));
        const j = getAgentJob(jobId);
        if (!j) break;
        if (j.status === 'succeeded' || j.status === 'failed') {
          lastOutput = j.output || '';
          break;
        }
      }
    }
  })().catch((err) => console.error('[cluster] run chain error:', err));

  return { success: true, roleCount: roles.length };
}

// ─── Roles ───

export async function createClusterRoleAction(clusterId, roleName) {
  await requireClusterOwner(clusterId);
  const result = dbCreateRole(clusterId, { roleName });
  reloadClusterRuntime();
  return result;
}

export async function updateClusterRoleAction(roleId, updates) {
  await requireRoleOwner(roleId);
  updateClusterRole(roleId, updates);
  if (updates.triggerConfig !== undefined) reloadClusterRuntime();
  return { success: true };
}

export async function deleteClusterRoleAction(roleId) {
  await requireRoleOwner(roleId);
  dbDeleteRole(roleId);
  reloadClusterRuntime();
  return { success: true };
}

export async function triggerRoleManually(roleId) {
  const { role } = await requireRoleOwner(roleId);
  return acquireAndRunRole(role, null, { type: 'manual' });
}

export async function stopRoleContainersAction(roleId) {
  const { role } = await requireRoleOwner(roleId);

  const { clusterShortId, roleShortId } = await import('../db/clusters.js');
  const cid = clusterShortId(role.cluster);
  const rid = roleShortId(role);
  const containers = await listContainers(`cluster-${cid}-role-${rid}`);

  for (const c of containers) {
    const name = (c.Names?.[0] || '').replace(/^\//, '');
    await removeContainer(name).catch(() => {});
  }

  return { stopped: containers.length };
}
