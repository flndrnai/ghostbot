import { eq, desc, and, isNotNull, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { clusters, clusterRoles } from './schema.js';

// ─── Clusters ───

export function createCluster(userId, { name, systemPrompt = '' }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.insert(clusters).values({ id, userId, name, systemPrompt, createdAt: now, updatedAt: now }).run();
  return { id };
}

export function getClusterById(id) {
  return getDb().select().from(clusters).where(eq(clusters.id, id)).get();
}

export function getClustersByUser(userId) {
  return getDb().select().from(clusters).where(eq(clusters.userId, userId)).orderBy(desc(clusters.updatedAt)).all();
}

export function updateCluster(id, data) {
  getDb().update(clusters).set({ ...data, updatedAt: Date.now() }).where(eq(clusters.id, id)).run();
}

export function toggleClusterEnabled(id) {
  const c = getClusterById(id);
  if (!c) return false;
  const newVal = c.enabled ? 0 : 1;
  getDb().update(clusters).set({ enabled: newVal, updatedAt: Date.now() }).where(eq(clusters.id, id)).run();
  return newVal === 1;
}

export function toggleClusterStarred(id) {
  const c = getClusterById(id);
  if (!c) return false;
  const newVal = c.starred ? 0 : 1;
  getDb().update(clusters).set({ starred: newVal, updatedAt: Date.now() }).where(eq(clusters.id, id)).run();
  return newVal === 1;
}

export function deleteCluster(id) {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(clusterRoles).where(eq(clusterRoles.clusterId, id)).run();
    tx.delete(clusters).where(eq(clusters.id, id)).run();
  });
}

// ─── Roles ───

export function createClusterRole(clusterId, { roleName, role = '', prompt = 'Execute your role.' }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const maxSort = db.select({ max: sql`MAX(${clusterRoles.sortOrder})` }).from(clusterRoles).where(eq(clusterRoles.clusterId, clusterId)).get();
  const sortOrder = (maxSort?.max ?? -1) + 1;
  db.insert(clusterRoles).values({ id, clusterId, roleName, role, prompt, sortOrder, createdAt: now, updatedAt: now }).run();
  return { id };
}

export function getClusterRoleById(id) {
  return getDb().select().from(clusterRoles).where(eq(clusterRoles.id, id)).get();
}

export function getClusterRolesByCluster(clusterId) {
  return getDb().select().from(clusterRoles).where(eq(clusterRoles.clusterId, clusterId)).orderBy(clusterRoles.sortOrder).all();
}

export function updateClusterRole(id, data) {
  getDb().update(clusterRoles).set({ ...data, updatedAt: Date.now() }).where(eq(clusterRoles.id, id)).run();
}

export function deleteClusterRole(id) {
  getDb().delete(clusterRoles).where(eq(clusterRoles.id, id)).run();
}

// ─── Joins ───

export function getRoleWithCluster(roleId) {
  const role = getClusterRoleById(roleId);
  if (!role) return null;
  const cluster = getClusterById(role.clusterId);
  return { ...role, cluster };
}

export function getAllRolesWithTriggers() {
  const db = getDb();
  const roles = db.select().from(clusterRoles).where(isNotNull(clusterRoles.triggerConfig)).all();
  return roles.filter((r) => {
    const cluster = getClusterById(r.clusterId);
    return cluster?.enabled;
  }).map((r) => {
    const cluster = getClusterById(r.clusterId);
    return { ...r, cluster };
  });
}

export function roleShortId(role) {
  return (role.id || '').replace(/-/g, '').slice(0, 8);
}

export function clusterShortId(cluster) {
  return (cluster.id || '').replace(/-/g, '').slice(0, 8);
}
