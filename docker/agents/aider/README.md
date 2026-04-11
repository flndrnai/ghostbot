# GhostBot — Aider Coding Agent

Ephemeral Docker container that runs [Aider](https://github.com/Aider-AI/aider) against an Ollama
model to autonomously edit a GitHub repo and push the result.

## Why Aider (vs OpenCode)

OpenCode relies on the OpenAI `tool_calls` protocol, which Qwen 2.5 Coder 7b/14b emit unreliably
through Ollama's openai-compat layer — they hallucinate the call as JSON text and the edit never
happens. Aider sidesteps this entirely by parsing **markdown code-block diffs** from the model's
plain text output. Any model that can write a diff in a code fence works, including Qwen 7b/14b.

## Build

```bash
ssh root@<your-vps>
cd /opt/ghostbot-source && git pull
docker build -t ghostbot:coding-agent-aider \
  -f docker/agents/aider/Dockerfile docker/agents/aider
```

## Manual smoke test

```bash
docker run --rm \
  -e GH_TOKEN="github_pat_xxx" \
  -e GH_REPO="flndrnai/ghostbot" \
  -e GH_BRANCH="agent-job/aider-smoke-$(date +%s)" \
  -e BASE_BRANCH="main" \
  -e PROMPT='Add a single comment line to the top of README.md saying "Aider test ok"' \
  -e OLLAMA_BASE_URL="http://187.124.64.116:11434" \
  -e MODEL="qwen2.5-coder:14b" \
  ghostbot:coding-agent-aider
```

You should see:
1. `cloning flndrnai/ghostbot (main)...`
2. `running Aider...`
3. Aider's own output (model thinking, edit blocks)
4. `pushing agent-job/aider-smoke-...`
5. `done — branch ... is on origin`

## Required env vars

| Var | Purpose |
|---|---|
| `GH_TOKEN` | GitHub fine-grained PAT |
| `GH_REPO` | `owner/repo` |
| `GH_BRANCH` | New branch name to push |
| `BASE_BRANCH` | Branch to fork from (default: `main`) |
| `PROMPT` | The user's request |
| `OLLAMA_BASE_URL` | Ollama base URL **without** `/v1` (e.g. `http://187.124.64.116:11434`) |
| `MODEL` | Exact Ollama model name |

## Optional

| Var | Purpose |
|---|---|
| `COMMIT_MESSAGE` | Override the commit message |
| `AIDER_FILES` | Space-separated files to add to Aider's context up front (else Aider explores) |

## Differences from the OpenCode container

| | OpenCode | Aider |
|---|---|---|
| Base image | node:22-slim | python:3.12-slim |
| CLI | `opencode-ai` (npm) | `aider-chat` (pip) |
| Edit mechanism | tool_calls protocol | text diff blocks |
| Ollama env var | `OPENAI_BASE_URL` (with `/v1`) | `OLLAMA_API_BASE` (without `/v1`) |
| Model format | `openai/<model>` | `ollama/<model>` |
| Image size | ~1.9 GB | ~600 MB |
