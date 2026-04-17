'use client';

// Agent-job diff viewer powered by diff2html. Named MonacoDiffView to
// match the roadmap item naming ("Monaco editor + diff viewer") even
// though the underlying renderer is diff2html — it's already in our
// dependency tree, lighter than full Monaco, and produces the exact
// side-by-side GitHub-style view we want.
//
// A proper Monaco-based in-browser file EDITOR for Project Connect is
// scoped as a separate follow-up (save/publish/revert flow needs design).

import { useEffect, useState, useMemo } from 'react';
import { html as diff2htmlHtml } from 'diff2html';

// Escape the filename in the synthesised unified-diff header so the
// renderer can't be tricked by an attacker-controlled path name. The
// patch body itself is already escaped by diff2html during render.
function escapeForDiffHeader(name) {
  return String(name || '').replace(/[\r\n]/g, '');
}

function buildUnifiedDiff(file) {
  const safeName = escapeForDiffHeader(file.filename);
  // Standard unified-diff header that diff2html needs to attribute
  // hunks to a specific file. GitHub's compare API gives us hunks
  // without the --- / +++ lines, so we prepend them.
  return `diff --git a/${safeName} b/${safeName}\n` +
    `--- a/${safeName}\n` +
    `+++ b/${safeName}\n` +
    (file.patch || '');
}

function FileDiff({ file, layout }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!file.patch) { setHtml(''); return; }
    try {
      const out = diff2htmlHtml(buildUnifiedDiff(file), {
        drawFileList: false,
        matching: 'lines',
        outputFormat: layout === 'side-by-side' ? 'side-by-side' : 'line-by-line',
        renderNothingWhenEmpty: false,
      });
      setHtml(out);
    } catch {
      setHtml('');
    }
  }, [file.patch, file.filename, layout]);

  return (
    <details className="rounded-lg border border-border/60 bg-background/40">
      <summary className="cursor-pointer px-3 py-2 text-xs flex items-center justify-between gap-2">
        <span className="font-mono truncate">{file.filename}</span>
        <span className="flex-shrink-0 flex items-center gap-2 text-[10px]">
          <span className="text-primary">+{file.additions}</span>
          <span className="text-destructive">-{file.deletions}</span>
          <span className="text-muted-foreground uppercase">{file.status}</span>
        </span>
      </summary>
      {file.patch ? (
        <div
          className="gb-diff max-h-[32rem] overflow-auto border-t border-border/40"
          // diff2html escapes content during rendering. Patch content comes
          // from GitHub's compare API via our backend, not from direct user input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/40">
          No patch available (binary or too large)
        </p>
      )}
    </details>
  );
}

export function MonacoDiffView({ diff }) {
  const [layout, setLayout] = useState('line-by-line');
  const files = useMemo(() => diff.files || [], [diff.files]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{diff.totalCommits} commit(s) · {files.length} file(s) changed</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setLayout('line-by-line')}
            className={`px-2 py-0.5 rounded ${layout === 'line-by-line' ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60'}`}
          >
            Unified
          </button>
          <button
            type="button"
            onClick={() => setLayout('side-by-side')}
            className={`px-2 py-0.5 rounded ${layout === 'side-by-side' ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60'}`}
          >
            Side-by-side
          </button>
        </div>
      </div>
      {files.map((f) => (
        <FileDiff key={f.filename} file={f} layout={layout} />
      ))}
    </div>
  );
}
