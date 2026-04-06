#!/bin/bash
# Claude Code environment setup

# Write Claude settings with full permissions and session tracking hook
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'SETTINGS'
{
  "hasCompletedOnboarding": true,
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "WebFetch(*)"
    ],
    "deny": []
  },
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "bash -c 'echo $SESSION_ID > ~/.claude-ttyd-sessions/${PORT:-7681}'"
      }
    ]
  }
}
SETTINGS

echo "[setup] Wrote ~/.claude/settings.json"

# Register Playwright MCP for browser automation
claude mcp add --transport stdio playwright -- \
  npx -y @playwright/mcp@0.0.70 --headless --browser chromium
echo "[setup] Registered Playwright MCP"

# Create session tracking directory
mkdir -p ~/.claude-ttyd-sessions
echo "[setup] Claude Code setup complete"
