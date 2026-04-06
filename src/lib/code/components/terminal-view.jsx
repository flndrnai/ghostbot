'use client';

import { useRef, useEffect, useState } from 'react';

export function TerminalView({ workspaceId, sessionId = null }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let cleanup = false;

    async function init() {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      if (cleanup) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Cascadia Code", "Fira Code", monospace',
        theme: {
          background: '#050509',
          foreground: '#E5E2DA',
          cursor: '#F5D97A',
          selectionBackground: 'rgba(245, 217, 122, 0.2)',
          black: '#050509',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#F5D97A',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#E5E2DA',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsPath = sessionId
        ? `/code/${workspaceId}/term/${sessionId}/ws`
        : `/code/${workspaceId}/ws`;
      const wsUrl = `${protocol}//${window.location.host}${wsPath}`;

      function connect() {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus('connected');
          term.write('\x1b[32mConnected to GhostBot workspace\x1b[0m\r\n');
        };

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            term.write(event.data);
          } else if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((buf) => term.write(new Uint8Array(buf)));
          }
        };

        ws.onclose = () => {
          setStatus('disconnected');
          if (!cleanup) {
            term.write('\r\n\x1b[33mDisconnected. Reconnecting...\x1b[0m\r\n');
            setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => ws.close();

        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });
      }

      connect();

      // Resize handling
      const observer = new ResizeObserver(() => {
        fitAddon.fit();
      });
      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }

    const resizeCleanup = init();

    return () => {
      cleanup = true;
      wsRef.current?.close();
      termRef.current?.dispose();
      resizeCleanup?.then((fn) => fn?.());
    };
  }, [workspaceId, sessionId]);

  const statusColor = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
  }[status];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-background/80">
        <div className={`h-2 w-2 rounded-full ${statusColor}`} />
        <span className="text-xs text-muted-foreground capitalize">{status}</span>
      </div>
      <div ref={containerRef} className="flex-1 bg-[#050509]" />
    </div>
  );
}
