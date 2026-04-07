import { auth } from '../../../../lib/auth/config.js';
import { getAgentJob } from '../../../../lib/agent-jobs/db.js';
import { getBranchDiff } from '../../../../lib/tools/github.js';

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });

  const job = getAgentJob(jobId);
  if (!job || job.userId !== session.user.id) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  if (job.status !== 'succeeded') {
    return Response.json({ error: 'Job has no diff (not succeeded)', status: job.status }, { status: 400 });
  }

  try {
    const diff = await getBranchDiff(job.repo, job.baseBranch || 'main', job.branch);
    return Response.json({ success: true, diff });
  } catch (err) {
    return Response.json({ error: err?.message || 'Failed to fetch diff' }, { status: 500 });
  }
}
