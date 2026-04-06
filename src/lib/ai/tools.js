import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getConfig } from '../config.js';
import { runHeadlessContainer, tailContainerLogs, waitForContainer, removeContainer } from '../tools/docker.js';
import { parseHeadlessStream } from './headless-stream.js';
import { createAgentJob } from '../tools/create-agent-job.js';

export const codingAgentTool = tool(
  async ({ prompt }, runManager) => {
    const config = runManager?.config?.configurable || {};
    const { workspaceId, repo, branch, codeModeType, streamCallback } = config;

    const resolvedRepo = repo || `${getConfig('GH_OWNER') || 'owner'}/${getConfig('GH_REPO') || 'repo'}`;
    const resolvedBranch = branch || 'main';
    const codingAgent = getConfig('CODING_AGENT') || 'claude-code';
    const containerName = `ghostbot-${codingAgent}-headless-${crypto.randomUUID().slice(0, 8)}`;
    const mode = codeModeType === 'code' ? 'dangerous' : 'plan';

    const session = [{ type: 'meta', codingAgent, backendApi: 'resolving...' }];

    try {
      const { backendApi } = await runHeadlessContainer({
        containerName,
        repo: resolvedRepo,
        branch: resolvedBranch,
        workspaceId,
        taskPrompt: prompt,
        mode,
        codingAgent,
        injectSecrets: true,
      });

      session[0].backendApi = backendApi;

      const logStream = await tailContainerLogs(containerName);
      const eventStream = parseHeadlessStream(logStream, codingAgent);

      for await (const event of eventStream) {
        session.push(event);
        if (streamCallback) streamCallback(event);
      }

      const exitCode = await waitForContainer(containerName);
      session.push({ type: 'exit', exitCode });

    } catch (error) {
      session.push({ type: 'error', message: error.message });
    } finally {
      removeContainer(containerName).catch(() => {});
    }

    return JSON.stringify(session);
  },
  {
    name: 'coding_agent',
    description: 'Run a coding agent to execute a programming task. The agent will read code, write files, run commands, and complete the task autonomously.',
    schema: z.object({
      prompt: z.string().describe('The coding task to execute'),
    }),
  },
);

export const agentJobTool = tool(
  async ({ prompt }) => {
    try {
      const result = await createAgentJob(prompt);
      return JSON.stringify({ success: true, ...result });
    } catch (error) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: 'agent_job',
    description: 'Create an autonomous agent job that runs in the background. Creates a GitHub branch, launches a Docker container, and creates a PR when done.',
    schema: z.object({
      prompt: z.string().describe('Description of the coding task for the autonomous agent'),
    }),
  },
);
