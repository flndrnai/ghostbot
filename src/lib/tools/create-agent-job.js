import { z } from 'zod';
import { getConfig } from '../config.js';
import { createModel } from '../ai/model.js';
import { getRef, createTree, createCommit, createRef } from './github.js';
import { runAgentJobContainer, waitForContainer, removeVolume } from './docker.js';

export async function createAgentJob(description, options = {}) {
  const repo = options.repo || `${getConfig('GH_OWNER')}/${getConfig('GH_REPO')}`;
  const branch = options.branch || 'main';
  const agentJobId = crypto.randomUUID().slice(0, 8);
  const containerName = `ghostbot-agent-job-${agentJobId}`;
  const volumeName = `ghostbot-agent-job-${agentJobId}`;

  // Generate title
  const title = await generateAgentJobTitle(description);

  // Create branch via GitHub Git Data API
  const mainRef = await getRef(repo, `heads/${branch}`);
  const mainSha = mainRef.object.sha;

  // Create config file
  const config = {
    agent_job_id: agentJobId,
    title,
    description,
    repo,
    branch,
    coding_agent: getConfig('CODING_AGENT') || 'claude-code',
    created_at: new Date().toISOString(),
  };

  const tree = await createTree(repo, mainSha, [
    {
      path: `logs/${agentJobId}/agent-job.config.json`,
      mode: '100644',
      type: 'blob',
      content: JSON.stringify(config, null, 2),
    },
  ]);

  const commit = await createCommit(repo, `agent-job: ${title}`, tree.sha, [mainSha]);
  await createRef(repo, `heads/agent-job/${agentJobId}`, commit.sha);

  // Launch Docker container (fire-and-forget)
  (async () => {
    try {
      await runAgentJobContainer({
        containerName,
        repo,
        branch: `agent-job/${agentJobId}`,
        agentJobId,
        taskPrompt: description,
        volumeName,
      });

      // Wait for container to finish, then cleanup
      await waitForContainer(containerName);
      await removeVolume(volumeName).catch(() => {});
    } catch (error) {
      console.error(`[agent-job] ${agentJobId} failed:`, error.message);
    }
  })();

  return { agent_job_id: agentJobId, branch: `agent-job/${agentJobId}`, title };
}

async function generateAgentJobTitle(description) {
  try {
    const model = await createModel({ maxTokens: 50 });
    const response = await model.invoke([
      { role: 'system', content: 'Generate a concise 3-6 word title for this coding task. Respond with ONLY the title, no quotes.' },
      { role: 'user', content: description },
    ]);
    const text = typeof response.content === 'string' ? response.content : '';
    return text.trim().replace(/^["']|["']$/g, '').slice(0, 80) || description.slice(0, 60);
  } catch {
    return description.slice(0, 60);
  }
}
