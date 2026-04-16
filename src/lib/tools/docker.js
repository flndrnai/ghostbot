import http from 'http';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config.js';
import { getCustomProvider } from '../db/config.js';
import { BUILTIN_PROVIDERS } from '../llm-providers.js';
import { PROJECT_ROOT } from '../paths.js';

const workspacesDir = path.join(PROJECT_ROOT, 'data/workspaces');
const CODING_AGENT_UID = 1001;

// ─── Agent container resource limits (Phase 3.2) ───
// A misbehaving or hostile agent must not be able to exhaust the host.
// Values can be overridden per install via env or admin-settable config.
// Numbers chosen for a solo / small-team deployment — adjust up if you
// run chunkier models or large repos.

function readLimit(key, fallback) {
  const raw = getConfig(key);
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAgentContainerLimits() {
  // Memory: 2 GB default. The Aider image + a small repo easily fits.
  // Bump if you see OOMs on large codebases.
  const memoryMb = readLimit('AGENT_MEMORY_LIMIT_MB', 2048);
  // CPU: 1 full core default. NanoCPUs = 1e9 = 1 CPU.
  const cpuCores = readLimit('AGENT_CPU_LIMIT', 1);
  // Pids: 256 is plenty for any coding-agent process tree and prevents fork bombs.
  const pidsLimit = readLimit('AGENT_PIDS_LIMIT', 256);

  return {
    Memory: Math.round(memoryMb * 1024 * 1024),
    MemorySwap: Math.round(memoryMb * 1024 * 1024), // disable swap by matching Memory
    NanoCPUs: Math.round(cpuCores * 1_000_000_000),
    PidsLimit: pidsLimit,
    // Defense in depth — block setuid escalation inside the container.
    SecurityOpt: ['no-new-privileges'],
  };
}

// Wall-clock timeout is enforced at the agent-jobs orchestration layer
// (polling loop in src/lib/agent-jobs/), not on the container HostConfig —
// Docker has no native "kill after N seconds from creation" feature.
// Default: 15 minutes. Override via env or `AGENT_TIMEOUT_SEC` in admin config.
export function getAgentTimeoutMs() {
  return readLimit('AGENT_TIMEOUT_SEC', 900) * 1000;
}

// ─── Docker Frame Parser ───

export class DockerFrameParser {
  constructor() { this.buf = Buffer.alloc(0); }

  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    const frames = [];
    while (this.buf.length >= 8) {
      const size = this.buf.readUInt32BE(4);
      if (this.buf.length < 8 + size) break;
      frames.push({
        stream: this.buf[0] === 2 ? 'stderr' : 'stdout',
        text: this.buf.slice(8, 8 + size).toString('utf8'),
      });
      this.buf = this.buf.slice(8 + size);
    }
    return frames;
  }

  static parse(buf) {
    return new DockerFrameParser().push(buf);
  }
}

// ─── Docker API ───

export function dockerApi(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      path: apiPath,
      method,
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, data: { message: data } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export function dockerApiStream(method, apiPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      path: apiPath,
      method,
    }, resolve);
    req.on('error', reject);
    req.end();
  });
}

// ─── Helpers ───

function workspaceDir(workspaceId) {
  const shortId = workspaceId.replace(/-/g, '').slice(0, 8);
  return path.join(workspacesDir, `workspace-${shortId}`);
}

export function workspaceDirExists(workspaceId) {
  return fs.existsSync(workspaceDir(workspaceId));
}

let cachedHostPath = null;

export async function resolveHostPath(containerPath) {
  if (cachedHostPath !== null) {
    return containerPath.replace(PROJECT_ROOT, cachedHostPath);
  }

  try {
    const { status, data } = await dockerApi('GET', '/containers/ghostbot-event-handler/json');
    if (status === 200 && data.Mounts) {
      const appMount = data.Mounts.find((m) => m.Destination === '/app');
      if (appMount) {
        cachedHostPath = appMount.Source;
        return containerPath.replace(PROJECT_ROOT, cachedHostPath);
      }
    }
  } catch {}

  // Not running in Docker — use path as-is
  cachedHostPath = PROJECT_ROOT;
  return containerPath;
}

async function detectNetwork() {
  try {
    const { status, data } = await dockerApi('GET', '/containers/ghostbot-event-handler/json');
    if (status === 200 && data.NetworkSettings?.Networks) {
      const networks = Object.keys(data.NetworkSettings.Networks);
      if (networks.length > 0) return networks[0];
    }
  } catch {}
  return 'bridge';
}

// ─── Container Lifecycle ───

export async function runContainer({ containerName, image, env = [], workingDir, hostConfig = {}, applyAgentLimits = true }) {
  const network = await detectNetwork();
  if (!hostConfig.NetworkMode) {
    hostConfig.NetworkMode = network;
  }

  // Phase 3.2: apply agent resource limits by default for every container
  // this module launches. Caller-supplied values in hostConfig take
  // precedence so existing tests / callers can override as needed.
  // Pass applyAgentLimits: false to opt out (e.g. for infra containers).
  if (applyAgentLimits) {
    const limits = getAgentContainerLimits();
    if (hostConfig.Memory === undefined) hostConfig.Memory = limits.Memory;
    if (hostConfig.MemorySwap === undefined) hostConfig.MemorySwap = limits.MemorySwap;
    if (hostConfig.NanoCPUs === undefined) hostConfig.NanoCPUs = limits.NanoCPUs;
    if (hostConfig.PidsLimit === undefined) hostConfig.PidsLimit = limits.PidsLimit;
    if (!hostConfig.SecurityOpt) hostConfig.SecurityOpt = limits.SecurityOpt;
  }

  // Pull image if not present
  const inspectRes = await dockerApi('GET', `/images/${encodeURIComponent(image)}/json`);
  if (inspectRes.status !== 200) {
    const [fromImage, tag] = image.includes(':') ? image.split(':') : [image, 'latest'];
    const pullRes = await dockerApi('POST', `/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(tag)}`);
    if (pullRes.status !== 200) {
      throw new Error(`Docker pull failed (${pullRes.status}): ${pullRes.data?.message || JSON.stringify(pullRes.data)}`);
    }
  }

  const createRes = await dockerApi('POST', `/containers/create?name=${encodeURIComponent(containerName)}`, {
    Image: image,
    Env: env,
    ...(workingDir ? { WorkingDir: workingDir } : {}),
    HostConfig: hostConfig,
  });

  if (createRes.status !== 201) {
    throw new Error(`Docker create failed (${createRes.status}): ${createRes.data?.message || JSON.stringify(createRes.data)}`);
  }

  const containerId = createRes.data.Id;

  const startRes = await dockerApi('POST', `/containers/${containerId}/start`);
  if (startRes.status !== 204 && startRes.status !== 304) {
    throw new Error(`Docker start failed (${startRes.status}): ${startRes.data?.message || JSON.stringify(startRes.data)}`);
  }

  return { containerId, containerName };
}

export async function runHeadlessContainer({ containerName, repo, branch, featureBranch, workspaceId, taskPrompt, mode = 'plan', codingAgent, systemPrompt, continueSession = true, injectSecrets }) {
  const agent = codingAgent || getConfig('CODING_AGENT') || 'claude-code';
  const image = `ghostbot:coding-agent-${agent}`;

  const env = [
    `RUNTIME=headless`,
    `REPO=${repo}`,
    `BRANCH=${branch}`,
    `PROMPT=${taskPrompt}`,
  ];

  if (featureBranch) env.push(`FEATURE_BRANCH=${featureBranch}`);
  if (mode) {
    const permission = mode === 'dangerous' ? 'code' : mode;
    env.push(`PERMISSION=${permission}`);
  }
  if (systemPrompt) env.push(`SYSTEM_PROMPT=${systemPrompt}`);
  if (continueSession) env.push(`CONTINUE_SESSION=1`);

  const { env: authEnv, backendApi } = buildAgentAuthEnv(agent);
  env.push(...authEnv);

  const ghToken = getConfig('GH_TOKEN');
  if (ghToken) env.push(`GH_TOKEN=${ghToken}`);

  const hostConfig = {};
  if (workspaceId) {
    const dir = workspaceDir(workspaceId);
    const wsDir = path.join(dir, 'workspace');
    fs.mkdirSync(wsDir, { recursive: true });
    try {
      fs.chownSync(dir, CODING_AGENT_UID, CODING_AGENT_UID);
      fs.chownSync(wsDir, CODING_AGENT_UID, CODING_AGENT_UID);
    } catch {}
    const hostDir = await resolveHostPath(dir);
    hostConfig.Binds = [`${hostDir}:/home/coding-agent`];
  }

  console.log(`[headless] agent=${agent} image=${image} backendApi=${backendApi}`);
  const result = await runContainer({ containerName, image, env, hostConfig });
  return { ...result, backendApi };
}

export async function runInteractiveContainer({ containerName, repo, branch, codingAgent, featureBranch, workspaceId, continueSession = true }) {
  const agent = codingAgent || getConfig('CODING_AGENT') || 'claude-code';
  const image = `ghostbot:coding-agent-${agent}`;

  const env = [
    `RUNTIME=interactive`,
    `REPO=${repo}`,
    `BRANCH=${branch}`,
  ];

  const { env: authEnv, backendApi } = buildAgentAuthEnv(agent);
  env.push(...authEnv);

  const ghToken = getConfig('GH_TOKEN');
  if (ghToken) env.push(`GH_TOKEN=${ghToken}`);
  if (featureBranch) env.push(`FEATURE_BRANCH=${featureBranch}`);
  if (continueSession) env.push(`CONTINUE_SESSION=1`);

  const hostConfig = {};
  if (workspaceId) {
    const dir = workspaceDir(workspaceId);
    const wsDir = path.join(dir, 'workspace');
    fs.mkdirSync(wsDir, { recursive: true });
    try {
      fs.chownSync(dir, CODING_AGENT_UID, CODING_AGENT_UID);
      fs.chownSync(wsDir, CODING_AGENT_UID, CODING_AGENT_UID);
    } catch {}
    const hostDir = await resolveHostPath(dir);
    hostConfig.Binds = [`${hostDir}:/home/coding-agent`];
  }

  const result = await runContainer({ containerName, image, env, hostConfig });
  return { ...result, backendApi };
}

export async function runAgentJobContainer({ containerName, repo, branch, agentJobId, taskPrompt, codingAgent, volumeName }) {
  const agent = codingAgent || getConfig('CODING_AGENT') || 'claude-code';
  const image = `ghostbot:coding-agent-${agent}`;

  const env = [
    `RUNTIME=agent-job`,
    `REPO=${repo}`,
    `BRANCH=agent-job/${agentJobId}`,
    `PROMPT=${taskPrompt}`,
    `AGENT_JOB_ID=${agentJobId}`,
  ];

  const { env: authEnv } = buildAgentAuthEnv(agent);
  env.push(...authEnv);

  const ghToken = getConfig('GH_TOKEN');
  if (ghToken) env.push(`GH_TOKEN=${ghToken}`);

  const hostConfig = {
    AutoRemove: true,
  };

  if (volumeName) {
    // Create named volume
    await dockerApi('POST', '/volumes/create', { Name: volumeName });
    hostConfig.Binds = [`${volumeName}:/home/coding-agent`];
  }

  return runContainer({ containerName, image, env, hostConfig });
}

// ─── Container Operations ───

export async function runClusterWorkerContainer({ containerName, codingAgent, env = [], binds = [], workingDir }) {
  const agent = codingAgent || getConfig('CODING_AGENT') || 'claude-code';
  const image = `ghostbot:coding-agent-${agent}`;

  const { env: authEnv } = buildAgentAuthEnv(agent);
  const fullEnv = ['RUNTIME=cluster-worker', ...authEnv, ...env];

  return runContainer({
    containerName,
    image,
    env: fullEnv,
    workingDir,
    hostConfig: {
      AutoRemove: true,
      ...(binds.length > 0 ? { Binds: binds } : {}),
    },
  });
}

export async function inspectContainer(containerName) {
  const { status, data } = await dockerApi('GET', `/containers/${encodeURIComponent(containerName)}/json`);
  if (status === 404) return null;
  if (status === 200) return data;
  throw new Error(`Docker inspect failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

export async function startContainer(containerName) {
  const { status, data } = await dockerApi('POST', `/containers/${encodeURIComponent(containerName)}/start`);
  if (status === 204 || status === 304) return;
  throw new Error(`Docker start failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

export async function removeContainer(containerName) {
  const { status, data } = await dockerApi('DELETE', `/containers/${encodeURIComponent(containerName)}?force=true`);
  if (status === 204 || status === 404) return;
  throw new Error(`Docker remove failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

export async function listContainers(nameFilter) {
  const filters = nameFilter ? `?filters=${encodeURIComponent(JSON.stringify({ name: [nameFilter] }))}` : '';
  const { data } = await dockerApi('GET', `/containers/json${filters}`);
  return Array.isArray(data) ? data : [];
}

export async function tailContainerLogs(containerName) {
  return dockerApiStream('GET', `/containers/${encodeURIComponent(containerName)}/logs?follow=true&stdout=true&stderr=false&tail=0`);
}

export async function waitForContainer(containerName) {
  const { data } = await dockerApi('POST', `/containers/${encodeURIComponent(containerName)}/wait`);
  return data?.StatusCode ?? -1;
}

export async function removeVolume(volumeName) {
  await dockerApi('DELETE', `/volumes/${encodeURIComponent(volumeName)}`);
}

// ─── Agent Auth ───

export function buildAgentAuthEnv(agent) {
  const env = [];
  let backendApi = 'anthropic';

  if (agent === 'claude-code') {
    backendApi = getConfig('CODING_AGENT_CLAUDE_CODE_BACKEND') || 'anthropic';
    if (backendApi === 'anthropic') {
      const authMode = getConfig('CODING_AGENT_CLAUDE_CODE_AUTH') || 'api-key';
      if (authMode === 'oauth') {
        const token = getConfig('CLAUDE_CODE_OAUTH_TOKEN');
        if (token) env.push(`CLAUDE_CODE_OAUTH_TOKEN=${token}`);
      } else {
        const key = getConfig('ANTHROPIC_API_KEY');
        if (key) env.push(`ANTHROPIC_API_KEY=${key}`);
      }
      const model = getConfig('CODING_AGENT_CLAUDE_CODE_MODEL');
      if (model) env.push(`LLM_MODEL=${model}`);
    } else {
      const provider = BUILTIN_PROVIDERS[backendApi];
      if (provider?.credentials?.[0]) {
        const apiKey = getConfig(provider.credentials[0].key);
        if (apiKey) env.push(`ANTHROPIC_AUTH_TOKEN=${apiKey}`);
      }
      const model = getConfig('CODING_AGENT_CLAUDE_CODE_MODEL');
      if (model) env.push(`ANTHROPIC_MODEL=${model}`);
    }
  } else if (agent === 'pi-coding-agent' || agent === 'opencode' || agent === 'kimi-cli') {
    const configPrefix = agent === 'opencode' ? 'CODING_AGENT_OPENCODE' : agent === 'kimi-cli' ? 'CODING_AGENT_KIMI_CLI' : 'CODING_AGENT_PI';
    const provider = getConfig(`${configPrefix}_PROVIDER`) || 'anthropic';
    backendApi = provider;
    const model = getConfig(`${configPrefix}_MODEL`);
    if (model) env.push(`LLM_MODEL=${model}`);

    const builtinKeyMap = {
      anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', google: 'GOOGLE_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY', minimax: 'MINIMAX_API_KEY', mistral: 'MISTRAL_API_KEY',
      xai: 'XAI_API_KEY', openrouter: 'OPENROUTER_API_KEY', kimi: 'MOONSHOT_API_KEY',
    };
    if (builtinKeyMap[provider]) {
      const key = getConfig(builtinKeyMap[provider]);
      if (key) env.push(`${builtinKeyMap[provider]}=${key}`);
    } else {
      const custom = getCustomProvider(provider);
      if (custom) {
        env.push(`CUSTOM_OPENAI_BASE_URL=${custom.baseUrl}`);
        if (custom.apiKey) env.push(`CUSTOM_API_KEY=${custom.apiKey}`);
      }
    }
  } else if (agent === 'gemini-cli') {
    backendApi = 'google';
    const key = getConfig('GOOGLE_API_KEY');
    if (key) env.push(`GOOGLE_API_KEY=${key}`);
    const model = getConfig('CODING_AGENT_GEMINI_CLI_MODEL');
    if (model) env.push(`LLM_MODEL=${model}`);
  } else if (agent === 'codex-cli') {
    backendApi = 'openai';
    const authMode = getConfig('CODING_AGENT_CODEX_CLI_AUTH') || 'api-key';
    if (authMode === 'oauth') {
      const token = getConfig('CODEX_OAUTH_TOKEN');
      if (token) env.push(`CODEX_OAUTH_TOKEN=${token}`);
    } else {
      const key = getConfig('OPENAI_API_KEY');
      if (key) env.push(`OPENAI_API_KEY=${key}`);
    }
    const model = getConfig('CODING_AGENT_CODEX_CLI_MODEL');
    if (model) env.push(`LLM_MODEL=${model}`);
  }

  return { env, backendApi };
}

// ─── Exec in Container ───

export async function execInContainer(containerName, cmd, timeoutMs = 5000) {
  try {
    const createRes = await dockerApi('POST',
      `/containers/${encodeURIComponent(containerName)}/exec`,
      { Cmd: ['sh', '-c', cmd], AttachStdout: true, AttachStderr: false },
    );
    if (createRes.status !== 201 || !createRes.data?.Id) return null;

    const execId = createRes.data.Id;

    const buf = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      const req = http.request({
        socketPath: '/var/run/docker.sock',
        path: `/exec/${execId}/start`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
      });
      req.on('error', (e) => { clearTimeout(timer); reject(e); });
      req.write(JSON.stringify({ Detach: false, Tty: false }));
      req.end();
    });

    return DockerFrameParser.parse(buf)
      .filter((f) => f.stream === 'stdout')
      .map((f) => f.text)
      .join('');
  } catch {
    return null;
  }
}

// ─── Wizard helper ───
// Returns { ok, version, agentImages[] } on success, { ok:false, error } on failure.
// Used by the setup wizard Step 2 — lightweight check that the Docker socket
// is reachable AND lists any ghostbot:coding-agent-* images present.
export async function pingDocker() {
  try {
    const { status, data } = await dockerApi('GET', '/version');
    if (status !== 200) return { ok: false, error: `Docker /version returned ${status}` };

    const version = data.Version || 'unknown';

    const imagesRes = await dockerApi('GET', '/images/json');
    const agentImages = imagesRes.status === 200
      ? (imagesRes.data || [])
          .flatMap((img) => img.RepoTags || [])
          .filter((tag) => tag && tag.startsWith('ghostbot:coding-agent-'))
      : [];

    return { ok: true, version, agentImages };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}
