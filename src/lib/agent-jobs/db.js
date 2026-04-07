import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { agentJobs } from '../db/schema.js';
import { publish } from '../sync/bus.js';

export function createAgentJob({
  id,
  chatId = null,
  userId,
  agent,
  image,
  prompt,
  repo,
  baseBranch,
  branch,
}) {
  const db = getDb();
  const now = Date.now();
  const jobId = id || crypto.randomUUID();
  db.insert(agentJobs)
    .values({
      id: jobId,
      chatId,
      userId,
      agent,
      image,
      prompt,
      repo,
      baseBranch,
      branch,
      status: 'pending',
      output: '',
      createdAt: now,
    })
    .run();

  publish(userId, {
    type: 'agent-job:created',
    job: { id: jobId, chatId, agent, prompt, repo, branch, status: 'pending', createdAt: now },
  });

  return jobId;
}

export function updateAgentJob(id, fields) {
  const db = getDb();
  db.update(agentJobs).set(fields).where(eq(agentJobs.id, id)).run();
  const job = getAgentJob(id);
  if (job?.userId) {
    publish(job.userId, {
      type: 'agent-job:updated',
      job: {
        id: job.id,
        chatId: job.chatId,
        status: job.status,
        output: job.output,
        error: job.error,
        prUrl: job.prUrl,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
    });
  }
}

export function appendAgentJobOutput(id, chunk) {
  if (!chunk) return;
  const db = getDb();
  const row = db.select().from(agentJobs).where(eq(agentJobs.id, id)).get();
  if (!row) return;
  const next = (row.output || '') + chunk;
  // Cap the stored output so a runaway container doesn't blow up the DB
  const capped = next.length > 100000 ? next.slice(-100000) : next;
  db.update(agentJobs).set({ output: capped }).where(eq(agentJobs.id, id)).run();
  publish(row.userId, {
    type: 'agent-job:log',
    jobId: id,
    chatId: row.chatId,
    chunk,
  });
}

export function getAgentJob(id) {
  const db = getDb();
  return db.select().from(agentJobs).where(eq(agentJobs.id, id)).get();
}

export function listAgentJobsByChat(chatId, userId) {
  const db = getDb();
  return db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.chatId, chatId), eq(agentJobs.userId, userId)))
    .orderBy(desc(agentJobs.createdAt))
    .all();
}

export function listAgentJobsByUser(userId, { limit = 50 } = {}) {
  const db = getDb();
  return db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.userId, userId))
    .orderBy(desc(agentJobs.createdAt))
    .limit(limit)
    .all();
}
