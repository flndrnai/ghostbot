#!/bin/bash
# Commit changes and push if agent succeeded
if [ "${AGENT_EXIT:-1}" -ne 0 ]; then
  echo "AGENT_FAILED (exit code: $AGENT_EXIT)"
  return 0
fi

source /scripts/common/rebase-push.sh
