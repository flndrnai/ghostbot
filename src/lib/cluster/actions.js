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

// ─── Clusters ───

export async function getClusters() {
  const session = await requireAuth();
  return getClustersByUser(session.user.id);
}

export async function getCluster(clusterId) {
  await requireAuth();
  const cluster = getClusterById(clusterId);
  if (!cluster) return null;
  const roles = getClusterRolesByCluster(clusterId);
  return { ...cluster, roles };
}

export async function createClusterAction(name) {
  const session = await requireAuth();
  return dbCreateCluster(session.user.id, { name });
}

export async function renameClusterAction(clusterId, name) {
  await requireAuth();
  updateCluster(clusterId, { name });
  return { success: true };
}

export async function toggleClusterAction(clusterId) {
  await requireAuth();
  const enabled = toggleClusterEnabled(clusterId);
  reloadClusterRuntime();
  return { enabled };
}

export async function starClusterAction(clusterId) {
  await requireAuth();
  const starred = toggleClusterStarred(clusterId);
  return { starred };
}

export async function updateClusterSystemPromptAction(clusterId, systemPrompt) {
  await requireAuth();
  updateCluster(clusterId, { systemPrompt });
  return { success: true };
}

export async function deleteClusterAction(clusterId) {
  await requireAuth();
  dbDeleteCluster(clusterId);
  reloadClusterRuntime();
  return { success: true };
}

// ─── Roles ───

export async function createClusterRoleAction(clusterId, roleName) {
  await requireAuth();
  const result = dbCreateRole(clusterId, { roleName });
  reloadClusterRuntime();
  return result;
}

export async function updateClusterRoleAction(roleId, updates) {
  await requireAuth();
  updateClusterRole(roleId, updates);
  if (updates.triggerConfig !== undefined) reloadClusterRuntime();
  return { success: true };
}

export async function deleteClusterRoleAction(roleId) {
  await requireAuth();
  dbDeleteRole(roleId);
  reloadClusterRuntime();
  return { success: true };
}

export async function triggerRoleManually(roleId) {
  await requireAuth();
  const role = getRoleWithCluster(roleId);
  if (!role) return { error: 'Role not found' };
  return acquireAndRunRole(role, null, { type: 'manual' });
}

export async function stopRoleContainersAction(roleId) {
  await requireAuth();
  const role = getRoleWithCluster(roleId);
  if (!role) return { error: 'Role not found' };

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
