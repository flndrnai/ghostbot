# GhostBot Coding Agent Images

Each subfolder is an independently buildable Docker image for a different
coding agent. They all share the same env-var interface so GhostBot can swap
between them by changing the agent name:

| Agent | Image tag | LLM | Best for |
|---|---|---|---|
| aider | `ghostbot:coding-agent-aider` | Any OpenAI-compatible (Ollama etc.) | Small open models, text-diff editing — most reliable on 7b/14b |
| opencode | `ghostbot:coding-agent-opencode` | Any OpenAI-compatible | Modern tool-calling, needs strong tool-use (30b+) |
| codex | `ghostbot:coding-agent-codex` | OpenAI API (paid) or compat | Maximum quality, pay per run |
| gemini | `ghostbot:coding-agent-gemini` | Google AI Studio | Free tier available, large context |

## Common interface (all agents)

Every image accepts the same base env vars:

| Var | Purpose |
|---|---|
| `GH_TOKEN` | GitHub fine-grained PAT with Read+write Contents/PRs/Issues |
| `GH_REPO` | `owner/repo` |
| `GH_BRANCH` | New branch name to push (e.g. `agent-job/12345`) |
| `BASE_BRANCH` | Branch to fork from (default: `main`) |
| `PROMPT` | The user's request |
| `COMMIT_MESSAGE` | Optional commit message override |

## Agent-specific env (LLM routing)

| Agent | LLM env vars |
|---|---|
| aider | `OLLAMA_BASE_URL` (no `/v1`), `OPENAI_API_KEY=ollama`, `MODEL` |
| opencode | `OPENAI_BASE_URL` (with `/v1`), `OPENAI_API_KEY=ollama`, `MODEL` |
| codex | `OPENAI_API_KEY` (real or `ollama`), optional `OPENAI_BASE_URL`, `MODEL` |
| gemini | `GEMINI_API_KEY`, `MODEL` |

GhostBot's `src/lib/agent-jobs/launch.js` builds the right env per agent
automatically based on the admin config. You just pick the agent in chat.

## Build all on your VPS

```bash
ssh root@<your-vps>
cd /opt/ghostbot-source && git pull

docker build -t ghostbot:coding-agent-aider    -f docker/agents/aider/Dockerfile    docker/agents/aider
docker build -t ghostbot:coding-agent-opencode -f docker/agents/opencode/Dockerfile docker/agents/opencode
docker build -t ghostbot:coding-agent-codex    -f docker/agents/codex/Dockerfile    docker/agents/codex
docker build -t ghostbot:coding-agent-gemini   -f docker/agents/gemini/Dockerfile   docker/agents/gemini

docker images | grep coding-agent
```

You only need to build the ones you actually use. Aider is the default.
