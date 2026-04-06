#!/bin/bash
# OpenCode environment setup

# Write system prompt if provided
if [ -n "$SYSTEM_PROMPT" ]; then
  echo "$SYSTEM_PROMPT" > AGENTS.md
  echo "[setup] Wrote AGENTS.md with system prompt"
fi

# Create opencode directories
mkdir -p .opencode
mkdir -p ~/.config/opencode

# Register Playwright MCP
cat > ~/.config/opencode/opencode.json << 'CONFIG'
{
  "mcp_servers": {
    "playwright": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.70", "--headless", "--browser", "chromium"]
    }
  }
}
CONFIG

echo "[setup] Wrote ~/.config/opencode/opencode.json with Playwright MCP"

# Create session tracking directory
mkdir -p ~/.opencode-ttyd-sessions

# Install session tracking plugin
if command -v bun &>/dev/null; then
  echo "[setup] Bun available for session tracking plugin"
fi

echo "[setup] OpenCode setup complete"
