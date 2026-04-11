// Self-Reflecting AI Scanner
// Daily cron job that analyzes recent activity and produces:
// 1. AI world insights (trends, new tools from conversations)
// 2. GhostBot self-improvement suggestions (pain points, failures)
// Results saved as knowledge entries for retrieval.

import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../paths.js';
import { getConfig } from '../config.js';
import { streamOllamaChat, pingOllama } from '../ai/ollama-client.js';
import { saveKnowledgeEntry, listKnowledgeEntries } from '../memory/store.js';
import { listChatSummaries } from '../memory/store.js';
import { listAgentJobsByUser } from '../agent-jobs/db.js';

/**
 * Gather the last N days of session logs for a user.
 */
function getRecentLogs(userId, days = 7) {
  const logsDir = path.join(PROJECT_ROOT, 'data', 'memory', userId, 'logs');
  if (!fs.existsSync(logsDir)) return '';

  const logs = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const logPath = path.join(logsDir, `${dateStr}.md`);
    try {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        if (content.length > 50) logs.push(content.slice(0, 2000));
      }
    } catch {}
  }
  return logs.join('\n\n---\n\n');
}

/**
 * Build a summary of recent agent job results.
 */
function getRecentJobsSummary(userId) {
  const jobs = listAgentJobsByUser(userId, { limit: 20 });
  if (!jobs.length) return 'No recent agent jobs.';

  return jobs.map((j) => {
    const status = j.status === 'succeeded' ? '✅' : j.status === 'failed' ? '❌' : '⏳';
    const prompt = (j.prompt || '').slice(0, 100);
    const error = j.error ? ` Error: ${j.error.slice(0, 100)}` : '';
    return `${status} [${j.agent}] ${prompt}${error}`;
  }).join('\n');
}

/**
 * Build a summary of recent chat topics.
 */
function getRecentChatTopics(userId) {
  const summaries = listChatSummaries({ userId, limit: 20 });
  if (!summaries.length) return 'No recent chat summaries.';

  return summaries.map((s) => {
    const topics = (() => { try { return JSON.parse(s.keyTopics || '[]').join(', '); } catch { return ''; } })();
    return `- ${s.summary}${topics ? ` [${topics}]` : ''}`;
  }).join('\n');
}

const SCANNER_PROMPT = `You are GhostBot's Self-Reflecting AI Scanner. Analyze the recent activity data below and produce a structured report.

## Your Tasks

### 1. AI & Dev World Insights
Based on the topics discussed in recent chats and agent jobs, identify:
- Emerging trends, tools, or technologies mentioned
- Interesting patterns in what the user is building or exploring
- Notable shifts in focus or priorities

### 2. GhostBot Self-Improvement Suggestions
Based on failures, errors, and user friction points:
- Common errors or failures in agent jobs (and suggested fixes)
- Features the user seems to need but doesn't have
- Workflow improvements that would save time
- Quality-of-life suggestions based on usage patterns

## Output Format
Use this exact markdown structure:

## AI & Dev Insights
- (bullet points of insights)

## Self-Improvement Suggestions
- (bullet points of actionable suggestions for GhostBot)

## Usage Summary
- Total chats analyzed: N
- Total agent jobs: N (succeeded: N, failed: N)
- Most discussed topics: topic1, topic2, topic3

Be concise and actionable. Skip obvious or generic advice.`;

/**
 * Run the scanner for a given user (or the first admin user).
 */
export async function runScanner(userId = null) {
  console.log('[scanner] starting scan...');

  // If no userId, find the first admin
  if (!userId) {
    const { getDb } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const admin = db.select().from(users).where(eq(users.role, 'admin')).limit(1).all();
    if (!admin.length) {
      console.log('[scanner] no admin user found, skipping');
      return null;
    }
    userId = admin[0].id;
  }

  const baseUrl = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';
  const model = getConfig('LLM_MODEL') || '';

  if (!model) {
    console.error('[scanner] no LLM model configured');
    return null;
  }

  // Verify Ollama is reachable
  const ping = await pingOllama(baseUrl);
  if (!ping.ok) {
    console.error('[scanner] Ollama unreachable:', ping.error);
    return null;
  }

  // Gather context
  const recentLogs = getRecentLogs(userId);
  const jobsSummary = getRecentJobsSummary(userId);
  const chatTopics = getRecentChatTopics(userId);

  if (!recentLogs && jobsSummary === 'No recent agent jobs.' && chatTopics === 'No recent chat summaries.') {
    console.log('[scanner] no recent activity to analyze');
    return null;
  }

  const contextMessage = `Here is the recent activity data to analyze:

### Recent Session Logs (last 7 days)
${recentLogs || '(no logs available)'}

### Recent Chat Summaries
${chatTopics}

### Recent Agent Jobs
${jobsSummary}

Analyze this data and produce your report.`;

  // Call the LLM
  const messages = [
    { role: 'system', content: SCANNER_PROMPT },
    { role: 'user', content: contextMessage },
  ];

  let fullResponse = '';
  try {
    const stream = streamOllamaChat({ baseUrl, model, messages, temperature: 0.4 });
    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.text) {
        fullResponse += chunk.text;
      }
    }
  } catch (err) {
    console.error('[scanner] LLM call failed:', err.message);
    return null;
  }

  if (!fullResponse) {
    console.log('[scanner] empty LLM response');
    return null;
  }

  // Save as a knowledge entry
  const today = new Date().toISOString().split('T')[0];
  const result = await saveKnowledgeEntry({
    userId,
    sourceType: 'scanner',
    title: `Daily Scan: ${today}`,
    content: fullResponse,
    metadata: { date: today, type: 'daily-scan' },
  });

  console.log(`[scanner] scan complete, saved as knowledge entry ${result.id}`);
  return { id: result.id, date: today, content: fullResponse };
}

/**
 * List past scanner results.
 */
export function listScannerResults(userId, { limit = 30 } = {}) {
  const entries = listKnowledgeEntries({ userId, limit: 200 });
  return entries
    .filter((e) => e.sourceType === 'scanner')
    .slice(0, limit);
}
