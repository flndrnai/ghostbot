#!/bin/bash
# Codex CLI environment setup

mkdir -p ~/.codex

# Write config with hooks enabled and Playwright MCP
cat > ~/.codex/config.toml << 'CONFIG'
codex_hooks = true

[[mcp_servers]]
name = "playwright"
transport = "stdio"
command = "npx"
args = ["-y", "@playwright/mcp@0.0.70", "--headless", "--browser", "chromium"]
CONFIG

echo "[setup] Wrote ~/.codex/config.toml"

# Write session tracking hook
cat > ~/.codex/hooks.json << 'HOOKS'
{
  "SessionStart": [
    {
      "type": "command",
      "command": "bash -c 'echo $SESSION_ID > ~/.codex-ttyd-sessions/${PORT:-7681}'"
    }
  ]
}
HOOKS

echo "[setup] Wrote ~/.codex/hooks.json"

# Write system prompt if provided
if [ -n "$SYSTEM_PROMPT" ]; then
  echo "$SYSTEM_PROMPT" > AGENTS.md
  echo "[setup] Wrote AGENTS.md with system prompt"
fi

# Create session tracking directory
mkdir -p ~/.codex-ttyd-sessions
echo "[setup] Codex CLI setup complete"
