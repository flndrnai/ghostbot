import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { PROJECT_ROOT } from './paths.js';
import { executeAction, resolveTemplates } from './actions.js';

const scheduledJobs = [];

export function loadCrons() {
  const filePath = path.join(PROJECT_ROOT, 'data/crons.json');

  if (!fs.existsSync(filePath)) {
    console.log('[cron] no crons.json found, skipping');
    return;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const crons = JSON.parse(raw);
    let count = 0;

    for (const entry of crons) {
      if (!entry.enabled || !entry.schedule) continue;

      if (!cron.validate(entry.schedule)) {
        console.error(`[cron] invalid schedule for "${entry.name}": ${entry.schedule}`);
        continue;
      }

      const job = cron.schedule(entry.schedule, async () => {
        console.log(`[cron] firing: ${entry.name}`);
        try {
          const resolved = {
            ...entry,
            job: resolveTemplates(entry.job, { datetime: new Date().toISOString() }),
            command: resolveTemplates(entry.command, { datetime: new Date().toISOString() }),
          };
          await executeAction(resolved, { cwd: PROJECT_ROOT });
        } catch (error) {
          console.error(`[cron] ${entry.name} failed:`, error.message);
        }
      });

      scheduledJobs.push(job);
      count++;
    }

    console.log(`[cron] loaded ${count} cron job(s)`);
  } catch (error) {
    console.error('[cron] failed to load:', error.message);
  }
}

export function stopAllCrons() {
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.length = 0;
}
