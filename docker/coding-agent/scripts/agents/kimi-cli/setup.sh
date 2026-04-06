#!/bin/bash
# Kimi CLI environment setup

mkdir -p ~/.kimi

# Write system prompt if provided
if [ -n "$SYSTEM_PROMPT" ]; then
  echo "$SYSTEM_PROMPT" > AGENTS.md
  echo "[setup] Wrote AGENTS.md with system prompt"
fi

# Register Playwright MCP for browser automation
kimi mcp add --transport stdio \
  -e PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  playwright -- \
  npx -y @playwright/mcp@0.0.70 --headless --browser chromium
echo "[setup] Registered Playwright MCP"

# Write session tracking hook in config
cat > ~/.kimi/config.toml << 'CONFIG'
[hooks]
[hooks.SessionStart]
type = "command"
command = "bash -c 'echo $SESSION_ID > ~/.kimi-ttyd-sessions/${PORT:-7681}'"
CONFIG

echo "[setup] Wrote ~/.kimi/config.toml with session tracking hook"

# Create session tracking directory
mkdir -p ~/.kimi-ttyd-sessions
echo "[setup] Kimi CLI setup complete"
