import { auth } from '../../../lib/auth/config.js';
import { launchAgentJob } from '../../../lib/agent-jobs/launch.js';
import { listAgentJobsByChat, listAgentJobsByUser, getAgentJob } from '../../../lib/agent-jobs/db.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

export async function POST(request) {
  // 10 launches/min per IP — generous for normal use, hard cap on runaway
  const limited = enforceRateLimit(request, 'agent-jobs:create', { limit: 10, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Re-run an existing job: POST { rerun: '<jobId>' }
  if (body?.rerun) {
    const old = getAgentJob(body.rerun);
    if (!old || old.userId !== session.user.id) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }
    try {
      const jobId = await launchAgentJob({
        chatId: old.chatId,
        userId: session.user.id,
        prompt: old.prompt,
        agent: old.agent,
        baseBranch: old.baseBranch,
      });
      return Response.json({ success: true, jobId, rerunOf: old.id });
    } catch (err) {
      return Response.json({ error: err?.message || 'Failed to re-run' }, { status: 500 });
    }
  }

  const { chatId = null, prompt, agent = 'aider', baseBranch = 'main' } = body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return Response.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const jobId = await launchAgentJob({
      chatId,
      userId: session.user.id,
      prompt: prompt.trim(),
      agent,
      baseBranch,
    });
    return Response.json({ success: true, jobId });
  } catch (err) {
    return Response.json({ error: err?.message || 'Failed to launch job' }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');
  const jobs = chatId
    ? listAgentJobsByChat(chatId, session.user.id)
    : listAgentJobsByUser(session.user.id, { limit: 50 });
  return Response.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      chatId: j.chatId,
      agent: j.agent,
      prompt: j.prompt,
      repo: j.repo,
      branch: j.branch,
      status: j.status,
      prUrl: j.prUrl,
      error: j.error,
      createdAt: j.createdAt,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      outputTail: (j.output || '').slice(-2000),
    })),
  });
}
