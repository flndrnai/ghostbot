'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, ArrowLeft } from '../../../lib/icons/index.jsx';
import { ensureWorkspaceContainer, createTerminalSession } from '../../../lib/code/actions.js';

const TerminalView = dynamic(
  () => import('../../../lib/code/components/terminal-view.jsx').then((m) => m.TerminalView),
  { ssr: false },
);

export function WorkspacePage({ workspace, session }) {
  const [activeTab, setActiveTab] = useState('primary');
  const [tabs, setTabs] = useState([{ id: 'primary', label: 'Terminal', sessionId: null }]);
  const [containerStatus, setContainerStatus] = useState('checking');

  useEffect(() => {
    ensureWorkspaceContainer(workspace.id).then((result) => {
      setContainerStatus(result.status);
    }).catch(() => setContainerStatus('error'));
  }, [workspace.id]);

  async function handleNewTab() {
    const { sessionId } = await createTerminalSession(workspace.id);
    const newTab = { id: sessionId, label: `Shell ${tabs.length}`, sessionId };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(sessionId);
  }

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 bg-background/80 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </a>
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-5 w-5" />
          <span className="text-sm font-semibold text-primary">{workspace.title || 'Workspace'}</span>
        </div>
        <span className="text-xs text-muted-foreground">{workspace.repo} ({workspace.branch})</span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border/50 px-4 py-1 bg-background/60">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={handleNewTab}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Terminal */}
      <div className="flex-1 relative">
        {containerStatus === 'running' || containerStatus === 'restarted' ? (
          <TerminalView
            key={currentTab.id}
            workspaceId={workspace.id}
            sessionId={currentTab.sessionId}
          />
        ) : containerStatus === 'checking' ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="animate-glow-pulse text-2xl mb-3">👻</div>
              <p className="text-sm">Starting container...</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Container {containerStatus}</p>
              <p className="text-xs mt-1 text-muted-foreground/50">Return to chat and create a new workspace</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
