#!/bin/bash
set -e

if [ -z "$RUNTIME" ]; then
  echo "ERROR: RUNTIME env var is required (agent-job, headless, interactive, cluster-worker, command/*)"
  exit 1
fi

if [ -z "$AGENT" ]; then
  echo "ERROR: AGENT env var is required (set by per-agent Dockerfile)"
  exit 1
fi

SCRIPT_DIR="/scripts/${RUNTIME}"
if [ ! -d "$SCRIPT_DIR" ]; then
  echo "ERROR: Unknown runtime '${RUNTIME}' — no scripts at ${SCRIPT_DIR}"
  exit 1
fi

AGENT_DIR="/scripts/agents/${AGENT}"
if [ ! -d "$AGENT_DIR" ]; then
  echo "ERROR: Unknown agent '${AGENT}' — no scripts at ${AGENT_DIR}"
  exit 1
fi

echo "[ghostbot] runtime=${RUNTIME} agent=${AGENT}"

# Source each numbered script in order
for script in $(ls "${SCRIPT_DIR}"/*.sh 2>/dev/null | sort); do
  echo "[ghostbot] running $(basename $script)"
  source "$script"
done

echo "[ghostbot] done"
