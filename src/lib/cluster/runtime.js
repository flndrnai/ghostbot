import cron from 'node-cron';
import { getAllRolesWithTriggers } from '../db/clusters.js';
import { acquireAndRunRole } from './execute.js';

let cronJobs = [];
let fileWatchers = [];

export function startClusterRuntime() {
  loadRoles();
}

export function reloadClusterRuntime() {
  // Stop all existing triggers
  for (const job of cronJobs) job.stop();
  cronJobs = [];

  for (const watcher of fileWatchers) watcher.close();
  fileWatchers = [];

  loadRoles();
}

function loadRoles() {
  let roles;
  try {
    roles = getAllRolesWithTriggers();
  } catch {
    console.log('[cluster-runtime] no roles with triggers found');
    return;
  }

  let cronCount = 0;
  let watchCount = 0;

  for (const role of roles) {
    let config;
    try {
      config = typeof role.triggerConfig === 'string' ? JSON.parse(role.triggerConfig) : role.triggerConfig;
    } catch {
      continue;
    }

    if (!config) continue;

    // Cron trigger
    if (config.cron?.schedule && config.cron?.enabled !== false) {
      if (cron.validate(config.cron.schedule)) {
        const job = cron.schedule(config.cron.schedule, () => {
          console.log(`[cluster-runtime] cron firing: ${role.roleName}`);
          acquireAndRunRole(role, null, { type: 'cron', schedule: config.cron.schedule });
        });
        cronJobs.push(job);
        cronCount++;
      }
    }

    // File watch trigger
    if (config.file_watch?.paths?.length > 0 && config.file_watch?.enabled !== false) {
      try {
        import('chokidar').then(({ default: chokidar }) => {
          const debounceMs = config.file_watch.debounce || 1000;
          let timeout = null;

          const watcher = chokidar.watch(config.file_watch.paths, {
            ignoreInitial: true,
            persistent: true,
          });

          watcher.on('all', (event, filePath) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              console.log(`[cluster-runtime] file-watch firing: ${role.roleName} (${event}: ${filePath})`);
              acquireAndRunRole(role, { files: [filePath] }, { type: 'file_watch', event, path: filePath });
            }, debounceMs);
          });

          fileWatchers.push(watcher);
        });
        watchCount++;
      } catch (err) {
        console.error(`[cluster-runtime] file watch failed for ${role.roleName}:`, err.message);
      }
    }
  }

  if (cronCount > 0 || watchCount > 0) {
    console.log(`[cluster-runtime] loaded ${cronCount} cron trigger(s), ${watchCount} file watcher(s)`);
  }
}

/**
 * Handle external webhook for a cluster role.
 */
export async function handleClusterWebhook(roleId, payload) {
  const { getRoleWithCluster } = await import('../db/clusters.js');
  const role = getRoleWithCluster(roleId);
  if (!role) return { error: 'Role not found' };

  const result = await acquireAndRunRole(role, payload, { type: 'webhook' });
  return result;
}
