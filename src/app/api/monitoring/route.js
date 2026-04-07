import { auth } from '../../../lib/auth/config.js';
import { getTokenUsageSummary, getUsageByProvider, getDailyUsage } from '../../../lib/db/token-usage.js';
import { listAgentJobsByUser } from '../../../lib/agent-jobs/db.js';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  const summary = getTokenUsageSummary(30);
  const byProvider = getUsageByProvider(30);
  const daily = getDailyUsage(14);

  // Agent-job stats — counts by status for this user
  const allJobs = listAgentJobsByUser(session.user.id, { limit: 200 });
  const jobStats = { total: allJobs.length, succeeded: 0, failed: 0, running: 0, pending: 0 };
  for (const j of allJobs) {
    if (jobStats[j.status] !== undefined) jobStats[j.status] += 1;
  }
  const recentJobs = allJobs.slice(0, 5).map((j) => ({
    id: j.id,
    agent: j.agent,
    status: j.status,
    prompt: (j.prompt || '').slice(0, 120),
    repo: j.repo,
    branch: j.branch,
    prUrl: j.prUrl,
    createdAt: j.createdAt,
  }));

  return Response.json({ summary, byProvider, daily, jobStats, recentJobs });
}
