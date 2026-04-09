'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder, RefreshCw, X } from 'lucide-react';

function guessLang(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const map = {
    js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', py: 'py', rb: 'rb', go: 'go',
    rs: 'rs', java: 'java', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'md', html: 'html', css: 'css', scss: 'scss', sql: 'sql', sh: 'sh',
    toml: 'toml', xml: 'xml', svg: 'svg', txt: 'txt',
  };
  return map[ext] || '';
}

function TreeNode({ node, projectId, onFileSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1 py-1 px-1 hover:bg-muted/40 rounded text-xs cursor-pointer transition-colors"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <Folder className="h-3 w-3 text-primary/70 flex-shrink-0" />
          <span className="truncate text-foreground/80">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                projectId={projectId}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node)}
      className="w-full flex items-center gap-1 py-1 px-1 hover:bg-primary/10 rounded text-xs cursor-pointer transition-colors"
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      title={`Click to attach ${node.name}`}
    >
      <span className="w-3 flex-shrink-0" />
      <File className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
      <span className="truncate text-foreground/70">{node.name}</span>
      {node.size > 0 && (
        <span className="ml-auto text-[9px] text-muted-foreground/40 flex-shrink-0">
          {node.size > 1024 ? `${Math.round(node.size / 1024)}K` : `${node.size}B`}
        </span>
      )}
    </button>
  );
}

export function FileTree({ projectId, onFileAttach, onClose }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTree = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load files');
      setTree(data.files || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  async function handleFileSelect(node) {
    if (!onFileAttach) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(node.path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to read file');
      const lang = guessLang(node.name);
      const block = `\n\n\`${node.path}\`\n\`\`\`${lang}\n${data.file.content}\n\`\`\``;
      onFileAttach(block);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!projectId) return null;

  return (
    <div className="flex flex-col h-full border-r border-border/40 bg-background/60">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Project Files</span>
        <div className="flex items-center gap-1">
          <button
            onClick={loadTree}
            disabled={loading}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close file tree"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1 px-1" style={{ scrollbarWidth: 'thin' }}>
        {error && (
          <p className="px-2 py-2 text-[10px] text-destructive">{error}</p>
        )}
        {!loading && tree.length === 0 && !error && (
          <p className="px-2 py-4 text-[10px] text-muted-foreground text-center">Empty project</p>
        )}
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            projectId={projectId}
            onFileSelect={handleFileSelect}
          />
        ))}
      </div>
    </div>
  );
}
