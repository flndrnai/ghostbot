import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../paths.js';
import { getConfig } from '../config.js';
import { listContainers, runClusterWorkerContainer, resolveHostPath } from '../tools/docker.js';
import { roleShortId, clusterShortId } from '../db/clusters.js';

const clustersDir = path.join(PROJECT_ROOT, 'data/clusters');

// Per-role promise lock for atomic concurrency check
const roleLocks = new Map();

/**
 * Atomic check-then-run with concurrency gate.
 */
export async function acquireAndRunRole(roleData, payload = null, trigger = null) {
  const roleId = roleData.id;

  // Serialize per-role to prevent race conditions
  const prev = roleLocks.get(roleId) || Promise.resolve();
  const current = prev.then(() => _doAcquireAndRun(roleData, payload, trigger)).catch((err) => {
    console.error(`[cluster] acquireAndRunRole failed for ${roleData.roleName}:`, err.message);
    return { allowed: false, reason: 'error', error: err.message };
  });
  roleLocks.set(roleId, current);
  return current;
}

async function _doAcquireAndRun(roleData, payload, trigger) {
  if (!roleData.cluster?.enabled) {
    return { allowed: false, reason: 'disabled' };
  }

  // Check concurrency
  const cid = clusterShortId(roleData.cluster);
  const rid = roleShortId(roleData);
  const prefix = `cluster-${cid}-role-${rid}`;
  const running = await listContainers(prefix);

  if (running.length >= (roleData.maxConcurrency || 1)) {
    return { allowed: false, reason: 'concurrency' };
  }

  const result = await runClusterRole(roleData, payload, trigger);
  return { allowed: true, ...result };
}

/**
 * Launch a cluster worker container.
 */
export async function runClusterRole(roleData, payload = null, trigger = null) {
  const cid = clusterShortId(roleData.cluster);
  const rid = roleShortId(roleData);
  const workerUuid = crypto.randomUUID().slice(0, 8);
  const containerName = `cluster-${cid}-role-${rid}-${workerUuid}`;

  // Create directories
  const clusterDir = path.join(clustersDir, `cluster-${cid}`);
  const roleDir = path.join(clusterDir, `role-${rid}`);
  const workerDir = path.join(roleDir, `worker-${workerUuid}`);
  const logDir = path.join(clusterDir, 'logs', `role-${rid}`, `${Date.now()}_${workerUuid}`);

  fs.mkdirSync(path.join(workerDir, 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(clusterDir, 'shared'), { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  // Build template variables
  const vars = {
    CLUSTER_HOME: '/home/coding-agent/workspace',
    CLUSTER_SHARED_DIR: '/home/coding-agent/workspace/shared/',
    SELF_ROLE_NAME: roleData.roleName,
    SELF_WORKER_ID: workerUuid,
    SELF_WORK_DIR: `/home/coding-agent/workspace/role-${rid}/worker-${workerUuid}/`,
    SELF_TMP_DIR: `/home/coding-agent/workspace/role-${rid}/worker-${workerUuid}/tmp/`,
    DATETIME: new Date().toISOString(),
    WEBHOOK_PAYLOAD: payload ? JSON.stringify(payload) : '',
  };

  // Build prompts
  const systemPrompt = resolveTemplateVars(
    `${roleData.cluster.systemPrompt || ''}\n\n${roleData.role || ''}`.trim(),
    vars,
  );

  let userPrompt = roleData.prompt || 'Execute your role.';
  if (payload?.prompt) userPrompt = payload.prompt;
  userPrompt = resolveTemplateVars(userPrompt, vars);

  // Write session logs
  fs.writeFileSync(path.join(logDir, 'system-prompt.md'), systemPrompt);
  fs.writeFileSync(path.join(logDir, 'user-prompt.md'), userPrompt);
  fs.writeFileSync(path.join(logDir, 'meta.json'), JSON.stringify({ roleName: roleData.roleName, startedAt: new Date().toISOString() }));
  if (trigger) fs.writeFileSync(path.join(logDir, 'trigger.json'), JSON.stringify({ trigger, payload }));

  // Build env
  const env = [
    `SYSTEM_PROMPT=${systemPrompt}`,
    `PROMPT=${userPrompt}`,
    `ROLE_SHORT_ID=${rid}`,
    `ROLE_NAME=${roleData.roleName}`,
    `WORKER_UUID=${workerUuid}`,
    `LOG_DIR=logs/role-${rid}/${path.basename(logDir)}`,
  ];

  if (roleData.planMode) env.push('PLAN_MODE=1');
  if (trigger) env.push(`TRIGGER_LOG=${JSON.stringify({ trigger, payload })}`);

  const ghToken = getConfig('GH_TOKEN');
  if (ghToken) env.push(`GH_TOKEN=${ghToken}`);

  // Resolve host path for bind mount
  const hostClusterDir = await resolveHostPath(clusterDir);

  const result = await runClusterWorkerContainer({
    containerName,
    env,
    binds: [`${hostClusterDir}:/home/coding-agent/workspace`],
    workingDir: `/home/coding-agent/workspace/role-${rid}/worker-${workerUuid}/`,
  });

  // Schedule cleanup if enabled
  if (roleData.cleanupWorkerDir) {
    scheduleCleanup(containerName, workerDir);
  }

  return { containerName, workerUuid };
}

function scheduleCleanup(containerName, workerDir) {
  const check = async () => {
    try {
      const { inspectContainer } = await import('../tools/docker.js');
      const info = await inspectContainer(containerName);
      if (!info || info.State?.Status !== 'running') {
        fs.rmSync(workerDir, { recursive: true, force: true });
        return;
      }
    } catch {}
    setTimeout(check, 5000);
  };
  setTimeout(check, 5000);
}

function resolveTemplateVars(str, vars) {
  if (!str) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}
