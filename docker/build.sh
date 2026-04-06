#!/bin/bash
set -e

cd "$(dirname "$0")/coding-agent"

AGENTS=("claude-code" "pi-coding-agent" "gemini-cli" "codex-cli" "opencode" "kimi-cli")

echo "Building GhostBot coding agent images..."
echo ""

# Build base image
echo "=== Building base image ==="
docker build -t ghostbot:coding-agent-base -f Dockerfile .
echo ""

# Build per-agent images
for agent in "${AGENTS[@]}"; do
  echo "=== Building ghostbot:coding-agent-${agent} ==="
  docker build \
    --build-arg BASE_IMAGE=ghostbot:coding-agent-base \
    -t "ghostbot:coding-agent-${agent}" \
    -f "Dockerfile.${agent}" \
    .
  echo ""
done

echo "All images built:"
docker images --filter "reference=ghostbot:coding-agent-*" --format "  {{.Repository}}:{{.Tag}} ({{.Size}})"
