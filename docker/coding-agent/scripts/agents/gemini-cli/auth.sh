#!/bin/bash
# Gemini CLI authentication setup
# Map GOOGLE_API_KEY to GEMINI_API_KEY

if [ -n "$GOOGLE_API_KEY" ]; then
  export GEMINI_API_KEY="${GOOGLE_API_KEY}"
  echo "[auth] Mapped GOOGLE_API_KEY to GEMINI_API_KEY"
else
  echo "[auth] Using GEMINI_API_KEY from environment"
fi
