// GhostBot VS Code extension — webview wrapper.
//
// Mounts the user's GhostBot instance in a side panel and in a
// full-editor tab. The webview runs in an iframe so GhostBot's
// full UI (chat, sidebar, agents, admin) works unchanged,
// including the existing session cookie and real-time SSE sync.

const vscode = require('vscode');

function getConfiguredUrl() {
  const config = vscode.workspace.getConfiguration('ghostbot');
  const url = (config.get('url') || 'https://ghostbot.dev').trim().replace(/\/+$/, '');
  return url;
}

function buildIframeHtml(targetUrl) {
  // VS Code webviews don't allow inline scripts without CSP nonce, but an
  // <iframe src> is fine. We set strict sandbox flags so the embedded
  // GhostBot runs normally while still isolating it from the extension host.
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 frame-src ${targetUrl} https:;
                 style-src 'unsafe-inline';
                 font-src ${targetUrl} data: https:;">
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #050509; color: #e5e2da; font-family: -apple-system, system-ui, sans-serif; overflow: hidden; }
    #frame { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; }
    #loading { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #9a9a9a; pointer-events: none; }
    #loading.hidden { display: none; }
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
</body>
</html>`;
}

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
    webviewView.webview.html = buildIframeHtml(url);

    webviewView.onDidChangeVisibility(() => {
      // Re-render on config change while hidden
      if (webviewView.visible) {
        const nextUrl = getConfiguredUrl();
        if (webviewView.webview.html.indexOf(nextUrl) === -1) {
          webviewView.webview.html = buildIframeHtml(nextUrl);
        }
      }
    });
  }

  refresh() {
    if (this.view) {
      this.view.webview.html = buildIframeHtml(getConfiguredUrl());
    }
  }
}

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
  panel.webview.html = buildIframeHtml(getConfiguredUrl());
  return panel;
}

function activate(context) {
  const provider = new GhostBotWebviewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ghostbot.chatView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ghostbot.open', () => {
      // Prefer opening the sidebar view; fall back to a full panel
      vscode.commands.executeCommand('workbench.view.extension.ghostbot-sidebar').then(
        () => {},
        () => openFullPanel(context),
      );
    }),
    vscode.commands.registerCommand('ghostbot.newChat', () => {
      // New chat = reload the webview at the root URL
      provider.refresh();
      vscode.commands.executeCommand('workbench.view.extension.ghostbot-sidebar');
    }),
    vscode.commands.registerCommand('ghostbot.openInBrowser', () => {
      vscode.env.openExternal(vscode.Uri.parse(getConfiguredUrl()));
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

  // Optional auto-open on startup
  const config = vscode.workspace.getConfiguration('ghostbot');
  if (config.get('openOnStartup')) {
    setTimeout(() => vscode.commands.executeCommand('ghostbot.open'), 500);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
