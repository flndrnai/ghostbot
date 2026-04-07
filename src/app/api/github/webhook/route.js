import crypto from 'crypto';
import { getConfig } from '../../../../lib/config.js';
import { getConfigSecret } from '../../../../lib/db/config.js';
import { createNotification } from '../../../../lib/db/notifications.js';
import { fireTriggers } from '../../../../lib/triggers.js';
import { launchAgentJob } from '../../../../lib/agent-jobs/launch.js';
import { getAgentJob } from '../../../../lib/agent-jobs/db.js';
import { postPullRequestComment, getPullRequest } from '../../../../lib/tools/github.js';

const COMMAND_PREFIX = '/ghostbot';

export async function POST(request) {
  // Validate webhook secret
  const signature = request.headers.get('x-hub-signature-256');
  // Prefer the secret stored via setConfigSecret, fall back to the
  // old plain-config location for backward compat.
  const webhookSecret = getConfigSecret('GITHUB_WEBHOOK_SECRET') || getConfig('GITHUB_WEBHOOK_SECRET');

  const bodyText = await request.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (webhookSecret && signature) {
    const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(bodyText).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return new Response('Forbidden', { status: 403 });
      }
    } catch {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const event = request.headers.get('x-github-event') || 'unknown';
  console.log(`[github] webhook event: ${event}`);

  // Handle pull request events
  if (event === 'pull_request') {
    const action = body.action;
    const pr = body.pull_request;

    if (action === 'closed' && pr?.merged) {
      createNotification(
        `PR #${pr.number} merged: ${pr.title}`,
        { event, action, pr_number: pr.number, title: pr.title },
      );
    } else if (action === 'opened') {
      createNotification(
        `PR #${pr.number} opened: ${pr.title}`,
        { event, action, pr_number: pr.number, title: pr.title },
      );
    }
  }

  // ─── /ghostbot command on a PR comment ───
  if (event === 'issue_comment' && body.action === 'created' && body.issue?.pull_request) {
    const commentBody = (body.comment?.body || '').trim();
    if (commentBody.toLowerCase().startsWith(COMMAND_PREFIX)) {
      const prompt = commentBody.slice(COMMAND_PREFIX.length).trim();
      const repoFullName = body.repository?.full_name;
      const prNumber = body.issue?.number;
      const commenter = body.comment?.user?.login || 'unknown';

      if (prompt && repoFullName && prNumber) {
        handleGhostbotCommand({ repoFullName, prNumber, prompt, commenter }).catch((err) => {
          console.error('[github] /ghostbot handler crashed:', err);
        });
      }
    }
  }

  // Fire any matching triggers
  fireTriggers(`/github/${event}`, {
    body,
    headers: Object.fromEntries(request.headers),
  });

  return Response.json({ ok: true });
}

async function handleGhostbotCommand({ repoFullName, prNumber, prompt, commenter }) {
  // Fetch PR head branch so the agent edits the PR's branch, not main
  let headBranch;
  try {
    const pr = await getPullRequest(repoFullName, prNumber);
    headBranch = pr?.head?.ref;
  } catch (err) {
    console.error('[github] getPullRequest failed:', err.message);
    return;
  }
  if (!headBranch) {
    console.error('[github] PR has no head branch');
    return;
  }

  // Find an admin user to own the job
  const { getFirstAdminUser } = await import('../../../../lib/db/users.js');
  let adminUser;
  try {
    adminUser = typeof getFirstAdminUser === 'function' ? getFirstAdminUser() : null;
  } catch {}
  if (!adminUser) {
    console.error('[github] no admin user found; install without a seeded user');
    return;
  }

  let jobId;
  try {
    jobId = await launchAgentJob({
      chatId: null,
      userId: adminUser.id,
      prompt,
      agent: 'aider',
      baseBranch: headBranch,
    });
  } catch (err) {
    try {
      await postPullRequestComment(repoFullName, prNumber, `👻 GhostBot couldn't start: ${err.message}`);
    } catch {}
    return;
  }

  // Acknowledge
  try {
    await postPullRequestComment(
      repoFullName,
      prNumber,
      `👻 **GhostBot** picked up \`${COMMAND_PREFIX}\` from @${commenter}.\n\nJob \`${jobId.slice(0, 8)}\` is running on branch \`${headBranch}\`. I'll comment again when it finishes.`,
    );
  } catch (err) {
    console.error('[github] ack comment failed:', err.message);
  }

  // Watcher — poll and post the result
  const start = Date.now();
  const maxWait = 60 * 60 * 1000;
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 5000));
    const job = getAgentJob(jobId);
    if (!job) return;
    if (job.status === 'succeeded' || job.status === 'failed') {
      const icon = job.status === 'succeeded' ? '✅' : '❌';
      const body =
        `${icon} **GhostBot job \`${jobId.slice(0, 8)}\`** finished: **${job.status}**\n\n` +
        `Branch: \`${job.branch}\`\n` +
        (job.prUrl ? `\n[Open diff →](${job.prUrl})\n` : '') +
        (job.error ? `\n> ${job.error.slice(0, 300)}` : '');
      try {
        await postPullRequestComment(repoFullName, prNumber, body);
      } catch (err) {
        console.error('[github] final comment failed:', err.message);
      }
      return;
    }
  }
}
