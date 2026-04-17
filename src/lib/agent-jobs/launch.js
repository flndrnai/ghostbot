// Agent job launcher — spawns an ephemeral Docker container
// running the selected coding agent image (aider by default),
// streams logs back via the sync bus, and updates the agent_jobs
// row on completion.
//
// Fire-and-forget: the launch function returns the job id
// immediately; the container runs in the background.

import http from 'http';
import path from 'path';
import { getConfig } from '../config.js';
import { getConfigSecret } from '../db/config.js';
import { dockerApi, DockerFrameParser, resolveHostPath, getAgentContainerLimits, getAgentTimeoutMs, dockerRequestOptions } from '../tools/docker.js';
import { getChatById } from '../db/chats.js';
import { getProjectById, resolveProjectPath } from '../db/projects.js';
import {
  createAgentJob,
  updateAgentJob,
  appendAgentJobOutput,
  getAgentJob,
} from './db.js';
import { notifyAgentJob } from './notify.js';
import { requireNotDemo } from '../demo.js';

export async function launchAgentJob({
  chatId = null,
  userId,
  prompt,
  agent = 'aider',
  baseBranch = 'main',
}) {
  // Demo mode — no agent containers launched (LLM cost + security).
  // Thrown error surfaces to the caller which already handles failure
  // paths; the chat UI renders the error text in the job card.
  requireNotDemo('Agent job launching');

  // Check if this chat has a connected project (local project mode)
  let projectPath = null;
  if (chatId) {
    const chat = getChatById(chatId);
    if (chat?.projectId) {
      const project = getProjectById(chat.projectId);
      if (project) projectPath = resolveProjectPath(project.path);
    }
  }

  // GitHub mode: require GitHub config
  let ghToken, repo, branch;
  if (!projectPath) {
    ghToken = getConfigSecret('GH_TOKEN');
    const owner = getConfig('GH_OWNER');
    const repoName = getConfig('GH_REPO');
    if (!ghToken || !owner || !repoName) {
      throw new Error('GitHub not configured. Go to Admin > GitHub and save a token + owner/repo.');
    }
    repo = `${owner}/${repoName}`;
  } else {
    repo = 'local/project';
    ghToken = '';
  }

  const ollamaBaseUrl = (getConfig('OLLAMA_BASE_URL') || '').replace(/\/+$/, '');
  const model = getConfig('LLM_MODEL') || '';
  if (!ollamaBaseUrl || !model) {
    throw new Error('LLM not configured. Go to Admin > LLM Providers and pick a model.');
  }

  const jobId = crypto.randomUUID();
  branch = projectPath ? 'local' : `agent-job/${jobId.slice(0, 8)}-${Date.now()}`;
  const image = `ghostbot:coding-agent-${agent}`;
  const containerName = `ghostbot-job-${jobId.slice(0, 12)}`;

  createAgentJob({
    id: jobId,
    chatId,
    userId,
    agent,
    image,
    prompt,
    repo,
    baseBranch,
    branch,
  });

  // Base env shared by every agent
  const baseEnv = [
    `GH_TOKEN=${ghToken || ''}`,
    `GH_REPO=${repo}`,
    `GH_BRANCH=${branch}`,
    `BASE_BRANCH=${baseBranch}`,
    `PROMPT=${prompt}`,
  ];

  // Agent-specific env
  const extraEnv = buildAgentEnv(agent, { ollamaBaseUrl, model });

  // Resolve host path for project mount (Docker needs the host-side path)
  let hostProjectPath = null;
  if (projectPath) {
    hostProjectPath = await resolveHostPath(projectPath);
  }

  // Kick off the container in the background; don't await
  runJobContainer({
    jobId,
    containerName,
    image,
    env: [...baseEnv, ...extraEnv],
    hostProjectPath,
  }).catch((err) => {
    console.error('[agent-job] background runner crashed:', err);
    updateAgentJob(jobId, {
      status: 'failed',
      error: err?.message || String(err),
      completedAt: Date.now(),
    });
    notifyAgentJob('failed', getAgentJob(jobId)).catch(() => {});
  });

  return jobId;
}

// Per-agent environment builder.
// Each coding agent has its own conventions for LLM routing:
//   - aider    : OLLAMA_BASE_URL (no /v1) + OPENAI_API_KEY (any)  via LiteLLM
//   - opencode : OPENAI_BASE_URL (with /v1) + OPENAI_API_KEY      via ai-sdk
//   - codex    : OPENAI_API_KEY (+ optional OPENAI_BASE_URL)
//   - gemini   : GEMINI_API_KEY
function buildAgentEnv(agent, { ollamaBaseUrl, model }) {
  const base = ollamaBaseUrl.replace(/\/+$/, '');
  switch (agent) {
    case 'aider':
      return [
        `OLLAMA_BASE_URL=${base}`,
        `OPENAI_API_KEY=ollama`,
        `MODEL=${model}`,
      ];
    case 'opencode':
      return [
        `OPENAI_BASE_URL=${base}/v1`,
        `OPENAI_API_KEY=ollama`,
        `MODEL=${model}`,
      ];
    case 'codex': {
      const codexKey = getConfigSecret('OPENAI_API_KEY') || 'ollama';
      return [
        `OPENAI_API_KEY=${codexKey}`,
        `OPENAI_BASE_URL=${base}/v1`,
        `MODEL=${model}`,
      ];
    }
    case 'gemini': {
      const geminiKey = getConfigSecret('GOOGLE_API_KEY') || '';
      return [
        `GEMINI_API_KEY=${geminiKey}`,
        `MODEL=${model}`,
      ];
    }
    default:
      return [
        `OLLAMA_BASE_URL=${base}`,
        `OPENAI_API_KEY=ollama`,
        `MODEL=${model}`,
      ];
  }
}

async function runJobContainer({ jobId, containerName, image, env, hostProjectPath = null }) {
  updateAgentJob(jobId, { status: 'running', startedAt: Date.now() });
  notifyAgentJob('started', getAgentJob(jobId)).catch(() => {});

  // Ensure the image exists locally. We do NOT try to pull it — the
  // user builds agent images by hand on the VPS.
  const inspect = await dockerApi('GET', `/images/${encodeURIComponent(image)}/json`);
  if (inspect.status !== 200) {
    updateAgentJob(jobId, {
      status: 'failed',
      error: `Agent image ${image} is not built on this host. SSH to the VPS and build it first.`,
      completedAt: Date.now(),
    });
    return;
  }

  // Create the container (with optional project folder bind mount).
  // Phase 3.2: enforce resource limits so a hostile or runaway agent
  // can't exhaust the host. Defaults: 2 GB memory, 1 CPU, 256 PIDs,
  // no-new-privileges. Configurable via AGENT_* settings keys.
  const limits = getAgentContainerLimits();
  const hostConfig = {
    AutoRemove: false,
    Memory: limits.Memory,
    MemorySwap: limits.MemorySwap,
    NanoCPUs: limits.NanoCPUs,
    PidsLimit: limits.PidsLimit,
    SecurityOpt: limits.SecurityOpt,
  };
  if (hostProjectPath) {
    hostConfig.Binds = [`${hostProjectPath}:/home/coding-agent/workspace`];
  }

  const createRes = await dockerApi('POST', `/containers/create?name=${encodeURIComponent(containerName)}`, {
    Image: image,
    Env: env,
    HostConfig: hostConfig,
  });
  if (createRes.status !== 201) {
    updateAgentJob(jobId, {
      status: 'failed',
      error: `Docker create failed (${createRes.status}): ${createRes.data?.message || JSON.stringify(createRes.data)}`,
      completedAt: Date.now(),
    });
    return;
  }
  const containerId = createRes.data.Id;

  // Start
  const startRes = await dockerApi('POST', `/containers/${containerId}/start`);
  if (startRes.status !== 204 && startRes.status !== 304) {
    updateAgentJob(jobId, {
      status: 'failed',
      error: `Docker start failed (${startRes.status}): ${startRes.data?.message || JSON.stringify(startRes.data)}`,
      completedAt: Date.now(),
    });
    return;
  }

  // Stream logs via the Docker socket (or the docker-socket-proxy if
  // DOCKER_HOST is configured). HTTP long-poll follow=1.
  await new Promise((resolve) => {
    const req = http.request(
      dockerRequestOptions(
        `/containers/${containerId}/logs?follow=1&stdout=1&stderr=1`,
        'GET',
      ),
      (res) => {
        const parser = new DockerFrameParser();
        res.on('data', (buf) => {
          try {
            const frames = parser.push(buf);
            for (const f of frames) {
              if (f.text) appendAgentJobOutput(jobId, f.text);
            }
          } catch (err) {
            console.error('[agent-job] log parse error:', err.message);
          }
        });
        res.on('end', resolve);
        res.on('error', (err) => {
          console.error('[agent-job] log stream error:', err.message);
          resolve();
        });
      },
    );
    req.on('error', (err) => {
      console.error('[agent-job] log request error:', err.message);
      resolve();
    });
    req.end();
  });

  // Wait for container to exit, bounded by a wall-clock timeout (Phase 3.2).
  // Docker has no native "kill after N seconds" — we race the wait API
  // against a setTimeout and force-remove if we hit the deadline.
  const timeoutMs = getAgentTimeoutMs();
  let timedOut = false;
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      // Best-effort kill; the wait promise will then resolve with whatever
      // status Docker records when the container dies.
      dockerApi('POST', `/containers/${containerId}/kill`).catch(() => {});
      resolve({ data: { StatusCode: -1 } });
    }, timeoutMs);
  });
  const waitRes = await Promise.race([
    dockerApi('POST', `/containers/${containerId}/wait`),
    timeoutPromise,
  ]);
  if (timeoutHandle) clearTimeout(timeoutHandle);
  const exitCode = timedOut ? -1 : (waitRes?.data?.StatusCode ?? -1);
  if (timedOut) {
    appendAgentJobOutput(jobId, `\n[ghostbot] agent container exceeded ${timeoutMs / 1000}s timeout and was killed.\n`);
  }

  // Derive a PR URL heuristically from the output
  const jobNow = getAgentJob(jobId);
  let prUrl = null;
  if (jobNow?.output) {
    // If the agent pushed a branch, GitHub returns a compare link in the push output
    const match = jobNow.output.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/(?:pull\/new|compare)\/[^\s]+/);
    if (match) prUrl = match[0];
  }

  const finalStatus = exitCode === 0 ? 'succeeded' : 'failed';
  updateAgentJob(jobId, {
    status: finalStatus,
    error: exitCode === 0 ? null : `Container exited with code ${exitCode}`,
    prUrl,
    completedAt: Date.now(),
  });
  notifyAgentJob(finalStatus, getAgentJob(jobId)).catch(() => {});

  // Clean up the container (best effort)
  try {
    await dockerApi('DELETE', `/containers/${containerId}?force=1`);
  } catch {}
}
