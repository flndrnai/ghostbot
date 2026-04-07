# GhostBot Coding Agent — Aider
# Uses Aider's text-based diff format which works reliably with
# small open models (Qwen 2.5 Coder 7b/14b), unlike tool-call
# protocols which require strong fine-tuning.
#
# Build:
#   docker build -t ghostbot:coding-agent-aider \
#     -f docker/agents/aider/Dockerfile docker/agents/aider
#
# Test:
#   docker run --rm \
#     -e GH_TOKEN=github_pat_xxx \
#     -e GH_REPO=flndrnai/ghostbot \
#     -e GH_BRANCH=agent-job/test-1 \
#     -e BASE_BRANCH=main \
#     -e PROMPT='Add a comment to README.md' \
#     -e OLLAMA_BASE_URL=http://187.124.209.17:11434 \
#     -e MODEL=qwen2.5-coder:14b \
#     ghostbot:coding-agent-aider

FROM python:3.12-slim

# OS deps: git for repo ops, ca-certs for HTTPS, curl for diagnostics
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git \
      ca-certificates \
      curl \
 && rm -rf /var/lib/apt/lists/*

# Install Aider via pip. aider-chat is the official package name.
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir aider-chat

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
