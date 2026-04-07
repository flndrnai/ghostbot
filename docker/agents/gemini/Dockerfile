# GhostBot Coding Agent — Gemini CLI
# https://github.com/google-gemini/gemini-cli
#
# Needs a GEMINI_API_KEY (paid/free tier from Google AI Studio)
# OR a locally routed base URL.
#
# Build:
#   docker build -t ghostbot:coding-agent-gemini \
#     -f docker/agents/gemini/Dockerfile docker/agents/gemini

FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git \
      ca-certificates \
      curl \
 && rm -rf /var/lib/apt/lists/*

# Install Gemini CLI globally
RUN npm install -g @google/gemini-cli@latest

WORKDIR /workspace

RUN git config --global user.email "ghostbot@flndrn.dev" \
 && git config --global user.name  "GhostBot Agent" \
 && git config --global init.defaultBranch main \
 && git config --global advice.detachedHead false

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
