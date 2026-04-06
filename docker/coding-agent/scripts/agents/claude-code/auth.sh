#!/bin/bash
# Claude Code authentication setup
# Priority: OAuth token > Auth token with base URL > Direct API key

if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  # OAuth takes precedence — unset direct key so Claude Code uses OAuth
  unset ANTHROPIC_API_KEY
  echo "[auth] Using Claude Code OAuth token"
elif [ -n "$ANTHROPIC_AUTH_TOKEN" ]; then
  # Custom auth token with base URL (e.g., proxy or gateway)
  export ANTHROPIC_API_KEY="$ANTHROPIC_AUTH_TOKEN"
  export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
  echo "[auth] Using Anthropic auth token with base URL: $ANTHROPIC_BASE_URL"
else
  # ANTHROPIC_API_KEY already in env
  echo "[auth] Using ANTHROPIC_API_KEY from environment"
fi
