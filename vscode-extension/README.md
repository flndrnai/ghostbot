# GhostBot for VS Code

Open your self-hosted [GhostBot](https://ghostbot.dev) chat and coding agents directly inside VS Code.

## Features

- **Sidebar panel** — Chat with GhostBot without leaving the editor. Appears in the Activity Bar.
- **Full editor tab** — `GhostBot: Open` command opens GhostBot in a regular tab.
- **Send selection to chat** — Highlight code, right-click → `GhostBot: Send Selection to Chat`, or hit `⌘⇧↵` / `Ctrl+Shift+Enter`. Selection lands in the chat input as a fenced code block.
- **CodeLens** — "Ask GhostBot about this" appears above functions and classes. One click sends the surrounding context.
- **Session reuse** — Uses the same login cookie as your browser, so every feature works unchanged (chat history, real-time sync, agent jobs, memory, clusters).
- **Configurable URL** — point at any GhostBot instance via the `ghostbot.url` setting.

## Install

Install from the Marketplace once [it's published](https://marketplace.visualstudio.com/items?itemName=flndrn.ghostbot-vscode), or sideload the `.vsix`:

```bash
# Sideload a locally-built .vsix
cd vscode-extension
npm install
npx vsce package
code --install-extension ghostbot-vscode-*.vsix
```

## Configure

VS Code Settings → search **ghostbot**:

| Setting | Default | What it does |
|---|---|---|
| `ghostbot.url` | `https://ghostbot.dev` | Your GhostBot instance URL (HTTPS recommended) |
| `ghostbot.openOnStartup` | `false` | Auto-open the panel each VS Code launch |

## Commands

| Command | Shortcut | What it does |
|---|---|---|
| `GhostBot: Open` | — | Reveals the sidebar panel |
| `GhostBot: New Chat` | `⌘⇧G` / `Ctrl+Shift+G` | Reloads the sidebar to a fresh chat |
| `GhostBot: Send Selection to Chat` | `⌘⇧↵` / `Ctrl+Shift+Enter` | Sends highlighted code to the chat input |
| `GhostBot: Ask About This` | — | CodeLens one-click; sends the surrounding function/class |
| `GhostBot: Open in External Browser` | — | Opens `ghostbot.url` in your default browser |

All commands are accessible via the command palette (`⌘⇧P`).

## How it works

The extension is a thin webview wrapper. It mounts your GhostBot instance in an iframe inside a VS Code webview panel. All the heavy lifting — chat streaming, SSE sync, agent job launching, memory, clusters — still happens server-side in your self-hosted GhostBot. The extension gives it a home inside the editor.

You stay logged in via the same session cookie as the browser. No extra API keys.

## Security

- Webview runs with a strict sandbox that allows forms, scripts, popups-to-escape-sandbox, and same-origin (needed for Next.js session cookies and SSE).
- Only `https://` URLs are recommended for `ghostbot.url`. `http://localhost:3000` works for dev.
- The extension stores no credentials — all auth flows through your GhostBot instance's login page.

## Troubleshooting

**Webview shows a blank page**
- Check `ghostbot.url` — it must be reachable from your machine (VS Code extensions run in your desktop, not in a remote sandbox).
- Open Developer Tools in VS Code (`⌘⇧I`) — network errors will surface there.

**"GhostBot: Send Selection" does nothing**
- Make sure you actually have a text selection. The command is only enabled when `editorHasSelection` is true.
- The sidebar needs to be open — if the webview isn't mounted, the send-message channel has nowhere to deliver.

**Commands don't appear in the palette**
- Reload VS Code (`⌘⇧P` → "Developer: Reload Window") — extensions sometimes fail to activate cleanly after updates.

## Requirements

- VS Code 1.85.0 or newer
- A running GhostBot instance (self-hosted or at `ghostbot.dev`)

## Links

- **Source**: [github.com/flndrnai/ghostbot](https://github.com/flndrnai/ghostbot) (`vscode-extension/` directory)
- **Self-host GhostBot**: [github.com/flndrnai/ghostbot#quick-start](https://github.com/flndrnai/ghostbot#quick-start)
- **Report an issue**: [github.com/flndrnai/ghostbot/issues](https://github.com/flndrnai/ghostbot/issues)

## License

MIT — see [LICENSE](LICENSE).
