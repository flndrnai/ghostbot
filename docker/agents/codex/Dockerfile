# GhostBot Coding Agent — OpenAI Codex CLI
# https://github.com/openai/codex
#
# Needs an OPENAI_API_KEY (paid) OR an OpenAI-compatible endpoint
# like Ollama via OPENAI_BASE_URL. Same env-var interface as the
# Aider image so GhostBot can swap agents by image name only.
#
# Build:
#   docker build -t ghostbot:coding-agent-codex \
#     -f docker/agents/codex/Dockerfile docker/agents/codex

FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git \
      ca-certificates \
      curl \
 && rm -rf /var/lib/apt/lists/*

# Install Codex CLI globally. Package name: @openai/codex
RUN npm install -g @openai/codex@latest

WORKDIR /workspace

RUN git config --global user.email "ghostbot@flndrn.dev" \
 && git config --global user.name  "GhostBot Agent" \
 && git config --global init.defaultBranch main \
 && git config --global advice.detachedHead false

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
