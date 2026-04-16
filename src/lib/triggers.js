import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from './paths.js';
import { executeAction, resolveTemplates } from './actions.js';

let triggerMap = new Map();

export function loadTriggers() {
  const filePath = path.join(PROJECT_ROOT, 'data/triggers.json');

  if (!fs.existsSync(filePath)) {
    console.log('[triggers] no triggers.json found, skipping');
    return;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const triggers = JSON.parse(raw);

    triggerMap = new Map();
    for (const trigger of triggers) {
      if (!trigger.enabled || !trigger.watch_path) continue;
      const existing = triggerMap.get(trigger.watch_path) || [];
      existing.push(trigger);
      triggerMap.set(trigger.watch_path, existing);
    }

    console.log(`[triggers] loaded ${triggerMap.size} trigger path(s)`);
  } catch (error) {
    console.error('[triggers] failed to load:', error.message);
  }
}

export function getTriggersForPath(watchPath) {
  return triggerMap.get(watchPath) || [];
}

export function executeTriggerActions(triggers, context = {}) {
  if (!triggers || triggers.length === 0) return;

  for (const trigger of triggers) {
    for (const action of trigger.actions || []) {
      const resolved = {
        ...action,
        job: resolveTemplates(action.job, context),
        command: resolveTemplates(action.command, context),
      };

      // Fire-and-forget
      executeAction(resolved, { cwd: PROJECT_ROOT, data: context.body }).catch((err) => {
        console.error(`[triggers] action failed for ${trigger.name}:`, err.message);
      });
    }
  }
}

export function fireTriggers(watchPath, context = {}) {
  executeTriggerActions(triggerMap.get(watchPath), context);
}

export function getTriggerPaths() {
  return Array.from(triggerMap.keys());
}
