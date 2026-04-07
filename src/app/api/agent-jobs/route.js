import { auth } from '../../../lib/auth/config.js';
import { launchAgentJob } from '../../../lib/agent-jobs/launch.js';
import { listAgentJobsByChat, listAgentJobsByUser } from '../../../lib/agent-jobs/db.js';

export async function POST(request) {
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
