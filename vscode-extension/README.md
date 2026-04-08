# GhostBot for VS Code

Open your self-hosted GhostBot chat and coding agents directly inside VS Code.

## Features

- **Sidebar panel** — Chat with GhostBot without leaving the editor. Opens in the Activity Bar.
- **Full editor panel** — `GhostBot: Open` command opens GhostBot in a regular editor tab.
- **Session reuse** — Uses the same login cookie as your browser, so every feature works unchanged (chat history, real-time sync across devices, agent jobs, memory, clusters).
- **Configurable URL** — point at any GhostBot instance via the `ghostbot.url` setting.
- **Keybinding** — `⌘⇧G` (macOS) / `Ctrl+Shift+G` (Win/Linux) focuses the chat and starts a new conversation.

## Install (development — sideload)

The extension isn't published to the VS Code Marketplace yet. To install it locally:

### One-time — install vsce (VS Code Extension CLI)

```bash
npm install -g @vscode/vsce
```

### Package the extension

```bash
cd vscode-extension
vsce package
```

This produces `ghostbot-vscode-0.1.0.vsix` in the folder.

### Install the .vsix in VS Code

Option A — from the command line:

```bash
code --install-extension ghostbot-vscode-0.1.0.vsix
```

Option B — from the VS Code UI:

1. `Cmd+Shift+P` → "Extensions: Install from VSIX..."
2. Pick the `.vsix` file
3. Reload VS Code

## Configure

After install, open VS Code settings → search for **ghostbot** and set:

| Setting | Default | What it does |
|---|---|---|
| `ghostbot.url` | `https://ghostbot.dev` | Your GhostBot instance URL. Must be HTTPS. |
| `ghostbot.openOnStartup` | `false` | If true, auto-open the GhostBot panel each time VS Code launches. |

## Commands

| Command | Default shortcut | What it does |
|---|---|---|
| `GhostBot: Open` | (none) | Opens the GhostBot sidebar panel |
| `GhostBot: New Chat` | `⌘⇧G` / `Ctrl+Shift+G` | Reloads the sidebar to the root URL (new chat) |
| `GhostBot: Open in External Browser` | (none) | Opens your GhostBot instance in your default browser |

Run any of them from the command palette (`Cmd+Shift+P`).

## How it works

The extension is a thin webview wrapper. It mounts your GhostBot instance in an iframe inside a VS Code webview panel. All the heavy lifting — chat streaming, SSE sync, agent job launching, memory, clusters — still happens server-side in your self-hosted GhostBot. The extension just gives it a nice home inside the editor.

Because it's an iframe, you stay logged in via the same session cookie you use in the browser. No extra API keys to juggle.

## Security

- The webview uses a strict sandbox that still allows forms, scripts, popups-to-escape-sandbox, and same-origin (needed for Next.js session cookies and SSE).
- Only `https://` URLs should be used for `ghostbot.url`. `http://` works on localhost for dev but browsers will refuse to load mixed content in most cases.
- The extension does not store any credentials — all auth flows through your GhostBot instance's normal login page.

## Roadmap (v0.2+)

- Deep integration: send selected editor text to GhostBot chat as an attachment with one shortcut
- Status bar indicator showing active agent job count
- Code lens action: "Ask GhostBot to refactor this function"
- Publishing to the VS Code Marketplace once the extension stabilises
