# GhostBot Coding Agent — OpenCode
# Builds an ephemeral container that:
#   1. Clones a target branch
#   2. Runs OpenCode in headless mode against the user's prompt
#   3. Commits any changes
#   4. Pushes the branch
#   5. Exits
#
# Build:
#   docker build -t ghostbot:coding-agent-opencode -f docker/agents/opencode/Dockerfile docker/agents/opencode
#
# Test manually:
#   docker run --rm \
#     -e GH_TOKEN=github_pat_xxx \
#     -e GH_REPO=flndrnai/ghostbot \
#     -e GH_BRANCH=agent-job/test-1 \
#     -e BASE_BRANCH=main \
#     -e PROMPT='Add a comment to README.md saying "OpenCode was here"' \
#     -e OPENAI_BASE_URL=http://187.124.64.116:11434/v1 \
#     -e OPENAI_API_KEY=ollama \
#     -e MODEL=qwen2.5-coder:14b \
#     ghostbot:coding-agent-opencode

FROM node:22-slim

# OS deps: git for repo ops, ca-certs for HTTPS, curl for health checks
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git \
      ca-certificates \
      curl \
      jq \
 && rm -rf /var/lib/apt/lists/*

# Install OpenCode CLI globally.
# https://github.com/sst/opencode  — published as `opencode-ai` on npm.
RUN npm install -g opencode-ai@latest

# Workdir for the cloned repo
WORKDIR /workspace

# Sane git defaults so commits don't error
RUN git config --global user.email "ghostbot@flndrn.dev" \
 && git config --global user.name  "GhostBot Agent" \
 && git config --global init.defaultBranch main \
 && git config --global advice.detachedHead false

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
