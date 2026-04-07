# GhostBot — OpenCode Coding Agent

Ephemeral Docker container that runs [OpenCode](https://github.com/sst/opencode) against any
OpenAI-compatible LLM (Ollama, OpenAI, etc.) to autonomously edit a GitHub repo and push the result.

## Build the image

```bash
ssh root@<your-vps>
cd /opt/ghostbot   # or wherever the repo lives on the VPS
git pull
docker build \
  -t ghostbot:coding-agent-opencode \
  -f docker/agents/opencode/Dockerfile \
  docker/agents/opencode
```

That image name is what GhostBot's docker.js launches via the `agent: 'opencode'` option.

## Manual smoke test (do this BEFORE letting GhostBot orchestrate it)

```bash
docker run --rm \
  -e GH_TOKEN="github_pat_xxx" \
  -e GH_REPO="flndrnai/ghostbot" \
  -e GH_BRANCH="agent-job/smoke-$(date +%s)" \
  -e BASE_BRANCH="main" \
  -e PROMPT='Add a single comment line to the top of README.md saying "OpenCode test ok"' \
  -e OPENAI_BASE_URL="http://187.124.209.17:11434/v1" \
  -e OPENAI_API_KEY="ollama" \
  -e MODEL="qwen2.5-coder:7b" \
  ghostbot:coding-agent-opencode
```

You should see:

1. `cloning flndrnai/ghostbot (main)...`
2. `checked out new branch agent-job/smoke-...`
3. `running OpenCode in headless mode...` — and OpenCode token output
4. `committing...`
5. `pushing agent-job/smoke-...`
6. `done — branch ... is on origin`

Then go to https://github.com/flndrnai/ghostbot/branches and you should see the new branch with one
commit. Open a PR by hand to verify the change looks sane.

If anything fails:

| Symptom | Likely cause | Fix |
|---|---|---|
| `Authentication failed` on push | GH_TOKEN typo or wrong scopes | regenerate at github.com/settings/tokens |
| `Cannot reach Ollama` | wrong OPENAI_BASE_URL or firewall | curl the URL from the VPS to verify |
| `model not found` | model name typo | `ollama list` to confirm exact tag |
| OpenCode runs but no changes | model not following instruction | tighten the PROMPT or try a bigger model |

## Required environment variables

| Var | Purpose |
|---|---|
| `GH_TOKEN` | GitHub fine-grained PAT with Read+write Contents/PRs/Issues |
| `GH_REPO` | `owner/repo` (e.g. `flndrnai/ghostbot`) |
| `GH_BRANCH` | New branch name to push (e.g. `agent-job/12345`) |
| `BASE_BRANCH` | Branch to fork from (default: `main`) |
| `PROMPT` | The user's request |
| `OPENAI_BASE_URL` | Ollama (or any OpenAI-compatible) `/v1` endpoint |
| `OPENAI_API_KEY` | Any value for Ollama (use `ollama`) |
| `MODEL` | Exact model name from `ollama list` |

## Optional

| Var | Purpose |
|---|---|
| `COMMIT_MESSAGE` | Override the auto-generated commit message |

## Image lifecycle

- The container runs once per agent job and exits.
- GhostBot launches it via the Docker Unix socket (`/var/run/docker.sock`).
- The clone is shallow (`--depth 50`) to keep the container fast.
- No persistent volume — every run starts from a clean clone.
