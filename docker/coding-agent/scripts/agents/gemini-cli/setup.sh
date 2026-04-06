#!/bin/bash
# Gemini CLI environment setup

# Write system prompt if provided
mkdir -p ~/.gemini
if [ -n "$SYSTEM_PROMPT" ]; then
  echo "$SYSTEM_PROMPT" > ~/.gemini/SYSTEM.md
  export GEMINI_SYSTEM_MD=~/.gemini/SYSTEM.md
  echo "[setup] Wrote system prompt to ~/.gemini/SYSTEM.md"
else
  rm -f ~/.gemini/SYSTEM.md
fi

# Register Playwright MCP for browser automation
gemini mcp add playwright \
  npx -y @playwright/mcp@0.0.70 --headless --browser chromium --trust
echo "[setup] Registered Playwright MCP"

# Write settings with session tracking hook
cat > ~/.gemini/settings.json << 'SETTINGS'
{
  "hooks": {
    "AfterAgent": [
      {
        "type": "command",
        "command": "bash -c 'echo $SESSION_ID > ~/.gemini-ttyd-sessions/${PORT:-7681}'"
      }
    ]
  }
}
SETTINGS

echo "[setup] Wrote ~/.gemini/settings.json with session tracking hook"

# Create session tracking directory
mkdir -p ~/.gemini-ttyd-sessions
echo "[setup] Gemini CLI setup complete"
