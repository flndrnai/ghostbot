import { exec } from 'child_process';
import { promisify } from 'util';
import { PROJECT_ROOT } from './paths.js';

const execAsync = promisify(exec);

/**
 * Execute an action (agent, command, or webhook).
 * Used by both cron jobs and webhook triggers.
 */
export async function executeAction(action, opts = {}) {
  const type = action.type || 'agent';

  try {
    if (type === 'agent') {
      const { createAgentJob } = await import('./tools/create-agent-job.js');
      const result = await createAgentJob(action.job, {
        llmProvider: action.llm_provider,
        llmModel: action.llm_model,
      });
      console.log(`[action] agent-job ${result.agent_job_id} — ${result.title}`);
      return result;
    }

    if (type === 'command') {
      const { stdout, stderr } = await execAsync(action.command, {
        cwd: opts.cwd || PROJECT_ROOT,
        timeout: 30000,
      });
      const output = (stdout || stderr || '').trim();
      console.log(`[action] command: ${action.command.slice(0, 60)} → ${output.slice(0, 100)}`);
      return output;
    }

    if (type === 'webhook') {
      const method = (action.method || 'POST').toUpperCase();
      const fetchOpts = {
        method,
        headers: { 'Content-Type': 'application/json', ...action.headers },
      };

      if (method !== 'GET') {
        const body = { ...action.vars };
        if (opts.data) body.data = opts.data;
        fetchOpts.body = JSON.stringify(body);
      }

      const response = await fetch(action.url, fetchOpts);
      const result = `${method} ${action.url} → ${response.status}`;
      console.log(`[action] webhook: ${result}`);
      return result;
    }

    throw new Error(`Unknown action type: ${type}`);
  } catch (error) {
    console.error(`[action] ${type} failed:`, error.message);
    throw error;
  }
}

/**
 * Resolve template tokens in a string.
 * Supports: {{body}}, {{body.field}}, {{query.field}}, {{headers.field}}, {{datetime}}
 */
export function resolveTemplates(str, context = {}) {
  if (!str) return str;

  return str.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (match, group, field) => {
    if (group === 'datetime') return new Date().toISOString();

    const source = context[group];
    if (!source) return match;

    if (field) {
      return typeof source === 'object' ? (source[field] ?? match) : match;
    }

    return typeof source === 'object' ? JSON.stringify(source) : String(source);
  });
}
