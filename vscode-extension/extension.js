// GhostBot VS Code extension v0.2 — deep editor integration.
//
// Features:
//   - Webview sidebar + full-editor panel (v0.1)
//   - Send selection to GhostBot (v0.2)
//   - Status bar indicator for running agent jobs (v0.2)
//   - CodeLens "Ask GhostBot" above functions (v0.2)
//   - postMessage bridge for two-way communication (v0.2)

const vscode = require('vscode');

// ─── Config ────────────────────────────────────────────────

function getConfiguredUrl() {
  const config = vscode.workspace.getConfiguration('ghostbot');
  const url = (config.get('url') || 'https://ghostbot.dev').trim().replace(/\/+$/, '');
  return url;
}

// ─── Webview HTML ──────────────────────────────────────────

function buildIframeHtml(targetUrl, nonce) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 frame-src ${targetUrl} https:;
                 style-src 'unsafe-inline';
                 script-src 'nonce-${nonce}';
                 font-src ${targetUrl} data: https:;">
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #050509; color: #e5e2da; font-family: -apple-system, system-ui, sans-serif; overflow: hidden; }
    #frame { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; }
    #loading { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #9a9a9a; pointer-events: none; }
    iframe[data-loaded='1'] ~ #loading { display: none; }
  </style>
</head>
<body>
  <iframe id="frame"
          src="${targetUrl}"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads allow-top-navigation-by-user-activation"
          allow="clipboard-read; clipboard-write; fullscreen"
          referrerpolicy="no-referrer-when-downgrade"
          onload="document.getElementById('loading')?.classList.add('hidden'); this.dataset.loaded='1';"></iframe>
  <div id="loading">Loading GhostBot…</div>
  <script nonce="${nonce}">
    // postMessage relay: VS Code extension → iframe
    const vscodeApi = acquireVsCodeApi();
    const frame = document.getElementById('frame');

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      // Messages from VS Code extension host → relay to iframe
      if (data.source === 'ghostbot-extension') {
        try {
          frame.contentWindow.postMessage(data, '*');
        } catch (e) {
          console.error('Failed to relay to iframe:', e);
        }
        return;
      }

      // Messages from iframe → relay to extension host
      if (data.source === 'ghostbot-app') {
        vscodeApi.postMessage(data);
      }
    });
  </script>
</body>
</html>`;
}

function getNonce() {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

// ─── Webview Provider ──────────────────────────────────────

class GhostBotWebviewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      enableCommandUris: false,
      enableForms: true,
      retainContextWhenHidden: true,
    };
    const url = getConfiguredUrl();
    webviewView.webview.html = buildIframeHtml(url, getNonce());

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        const nextUrl = getConfiguredUrl();
        if (webviewView.webview.html.indexOf(nextUrl) === -1) {
          webviewView.webview.html = buildIframeHtml(nextUrl, getNonce());
        }
      }
    });

    // Handle messages from the webview (from the GhostBot app)
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === 'ghostbot:job-count') {
        updateStatusBar(message.count);
      }
    });
  }

  refresh() {
    if (this.view) {
      this.view.webview.html = buildIframeHtml(getConfiguredUrl(), getNonce());
    }
  }

  postMessage(data) {
    if (this.view) {
      this.view.webview.postMessage({ source: 'ghostbot-extension', ...data });
    }
  }
}

// ─── Full Panel ────────────────────────────────────────────

function openFullPanel(context) {
  const panel = vscode.window.createWebviewPanel(
    'ghostbot.fullPanel',
    'GhostBot',
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableForms: true,
    },
  );
  panel.webview.html = buildIframeHtml(getConfiguredUrl(), getNonce());
  return panel;
}

// ─── Status Bar ────────────────────────────────────────────

let statusBarItem = null;
let statusBarInterval = null;

function createStatusBar(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'ghostbot.open';
  statusBarItem.text = '$(ghost) GhostBot';
  statusBarItem.tooltip = 'Open GhostBot';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Poll for running jobs every 15 seconds
  statusBarInterval = setInterval(async () => {
    try {
      const url = getConfiguredUrl();
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url}/api/agent-jobs?status=running`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;
        updateStatusBar(count);
      }
    } catch {
      // Silently fail — server may be unreachable
    }
  }, 15000);
}

function updateStatusBar(runningCount) {
  if (!statusBarItem) return;
  if (runningCount > 0) {
    statusBarItem.text = `$(sync~spin) GhostBot (${runningCount} running)`;
    statusBarItem.tooltip = `${runningCount} agent job(s) running`;
  } else {
    statusBarItem.text = '$(ghost) GhostBot';
    statusBarItem.tooltip = 'Open GhostBot';
  }
}

// ─── CodeLens Provider ─────────────────────────────────────

class GhostBotCodeLensProvider {
  provideCodeLenses(document) {
    const lenses = [];
    const text = document.getText();
    // Match function/class/method definitions
    const patterns = [
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm,
      /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/gm,
      /^(?:export\s+)?class\s+(\w+)/gm,
      /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/gm,
      /^def\s+(\w+)/gm,
      /^class\s+(\w+)/gm,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const line = document.positionAt(match.index).line;
        const range = new vscode.Range(line, 0, line, 0);
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(ghost) Ask GhostBot',
            command: 'ghostbot.askAboutFunction',
            arguments: [document.uri, line],
          })
        );
      }
    }

    return lenses;
  }
}

// ─── Activate ──────────────────────────────────────────────

function activate(context) {
  const provider = new GhostBotWebviewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ghostbot.chatView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Register CodeLens provider for common languages
  const codeLensProvider = new GhostBotCodeLensProvider();
  const languages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'python', 'go', 'rust', 'java'];
  for (const lang of languages) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ language: lang }, codeLensProvider)
    );
  }

  // Commands
  context.subscriptions.push(
    // Open GhostBot
    vscode.commands.registerCommand('ghostbot.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.ghostbot-sidebar').then(
        () => {},
        () => openFullPanel(context),
      );
    }),

    // New chat
    vscode.commands.registerCommand('ghostbot.newChat', () => {
      provider.refresh();
      vscode.commands.executeCommand('workbench.view.extension.ghostbot-sidebar');
    }),

    // Open in browser
    vscode.commands.registerCommand('ghostbot.openInBrowser', () => {
      vscode.env.openExternal(vscode.Uri.parse(getConfiguredUrl()));
    }),

    // Send selected text to GhostBot
    vscode.commands.registerCommand('ghostbot.sendSelection', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor with selected text.');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showInformationMessage('Select some text first.');
        return;
      }

      const fileName = editor.document.fileName.split('/').pop();
      const language = editor.document.languageId;

      // Open the sidebar first
      vscode.commands.executeCommand('workbench.view.extension.ghostbot-sidebar').then(() => {
        // Send via postMessage to the iframe
        provider.postMessage({
          type: 'ghostbot:send-text',
          text,
          fileName,
          language,
        });
      });
    }),

    // Ask about function (from CodeLens)
    vscode.commands.registerCommand('ghostbot.askAboutFunction', (uri, line) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.uri.toString() !== uri.toString()) return;

      // Select from the CodeLens line to the next function or end of scope
      const doc = editor.document;
      let endLine = line + 1;
      let braceCount = 0;
      let started = false;

      // Find the function body
      for (let i = line; i < doc.lineCount && i < line + 200; i++) {
        const lineText = doc.lineAt(i).text;
        for (const char of lineText) {
          if (char === '{' || char === ':') { braceCount++; started = true; }
          if (char === '}') { braceCount--; }
        }
        if (started && braceCount <= 0) { endLine = i + 1; break; }
        endLine = i + 1;
      }

      const range = new vscode.Range(line, 0, endLine, 0);
      const text = doc.getText(range);
      const fileName = doc.fileName.split('/').pop();
      const language = doc.languageId;

      vscode.commands.executeCommand('workbench.view.extension.ghostbot-sidebar').then(() => {
        provider.postMessage({
          type: 'ghostbot:send-text',
          text,
          fileName,
          language,
        });
      });
    }),
  );

  // Re-render on setting change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('ghostbot.url')) {
        provider.refresh();
      }
    }),
  );

  // Status bar
  createStatusBar(context);

  // Optional auto-open on startup
  const config = vscode.workspace.getConfiguration('ghostbot');
  if (config.get('openOnStartup')) {
    setTimeout(() => vscode.commands.executeCommand('ghostbot.open'), 500);
  }
}

function deactivate() {
  if (statusBarInterval) {
    clearInterval(statusBarInterval);
    statusBarInterval = null;
  }
}

module.exports = { activate, deactivate };
