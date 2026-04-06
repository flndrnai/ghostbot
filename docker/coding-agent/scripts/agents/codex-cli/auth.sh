#!/bin/bash
# Codex CLI authentication setup
# Priority: OAuth token > API key login

if [ -n "$CODEX_OAUTH_TOKEN" ]; then
  # OAuth token — codex reads it from env directly
  echo "[auth] Using Codex OAuth token"
elif [ -n "$OPENAI_API_KEY" ]; then
  # Log in with API key via stdin
  echo "$OPENAI_API_KEY" | codex login --with-api-key
  echo "[auth] Logged in with OpenAI API key"
else
  echo "[auth] Warning: No Codex OAuth token or OpenAI API key found"
fi
