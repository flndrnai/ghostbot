import fs from 'fs';
import path from 'path';

const MAX_READ_BYTES = 1024 * 1024; // 1 MB
const MAX_TREE_DEPTH = 10;

// Common directories / files to always skip when listing
const ALWAYS_IGNORE = new Set([
  'node_modules', '.git', '.next', '__pycache__', '.DS_Store',
  'dist', 'build', '.cache', '.turbo', 'coverage',
]);

// ─── Security ────────────────────────────────────────────────

/**
 * Resolve a user-provided relative path within a project root.
 * Throws if the resolved path escapes the root (path traversal).
 */
export function sanitizePath(projectRoot, requestedPath) {
  if (!requestedPath) return projectRoot;

  // Belt: reject obvious traversal before resolution
  const normalized = requestedPath.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Path traversal not allowed');
  }

  const resolved = path.resolve(projectRoot, requestedPath);

  // Suspenders: verify the resolved path is inside the root
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error('Path traversal not allowed');
  }

  // Reject symlinks that point outside the project
  try {
    const real = fs.realpathSync(resolved);
    if (!real.startsWith(projectRoot + path.sep) && real !== projectRoot) {
      throw new Error('Symlink target outside project');
    }
  } catch (err) {
    // File may not exist yet (for writes) — that's OK
    if (err.code !== 'ENOENT') throw err;
  }

  return resolved;
}

// ─── List files ──────────────────────────────────────────────

/**
 * Return a tree of files/folders in the project.
 * Respects .gitignore-style ignore patterns (simplified) and ALWAYS_IGNORE.
 */
export function listFiles(projectRoot, subPath = '', depth = 0) {
  if (depth > MAX_TREE_DEPTH) return [];

  const dirPath = sanitizePath(projectRoot, subPath);
  if (!fs.existsSync(dirPath)) return [];

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) return [];

  // Load .gitignore patterns (simple: exact name match only)
  const ignorePatterns = loadGitignore(projectRoot);

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (ALWAYS_IGNORE.has(entry.name)) continue;
    if (ignorePatterns.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

    const relativePath = subPath ? `${subPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        type: 'dir',
        path: relativePath,
        children: listFiles(projectRoot, relativePath, depth + 1),
      });
    } else if (entry.isFile()) {
      result.push({
        name: entry.name,
        type: 'file',
        path: relativePath,
        size: fs.statSync(path.join(dirPath, entry.name)).size,
      });
    }
  }

  // Sort: folders first, then files, both alphabetical
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

function loadGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const patterns = new Set();
  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Simple: treat each non-comment line as a name to ignore
      // Strip trailing slashes for directory patterns
      patterns.add(trimmed.replace(/\/+$/, ''));
    }
  } catch {
    // No .gitignore — that's fine
  }
  return patterns;
}

// ─── Read file ───────────────────────────────────────────────

export function readFile(projectRoot, filePath) {
  const resolved = sanitizePath(projectRoot, filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }
  if (stat.size > MAX_READ_BYTES) {
    throw new Error(`File too large: ${filePath} (${Math.round(stat.size / 1024)} KB, max ${Math.round(MAX_READ_BYTES / 1024)} KB)`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const ext = path.extname(resolved).slice(1).toLowerCase();
  return { content, size: stat.size, extension: ext };
}

// ─── Write file ──────────────────────────────────────────────

export function writeFile(projectRoot, filePath, content) {
  const resolved = sanitizePath(projectRoot, filePath);

  // Create parent directories if needed
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(resolved, content, 'utf-8');
  return { path: filePath, size: Buffer.byteLength(content, 'utf-8') };
}

// ─── Create file or folder ───────────────────────────────────

export function createFileOrFolder(projectRoot, targetPath, type = 'file') {
  const resolved = sanitizePath(projectRoot, targetPath);

  if (fs.existsSync(resolved)) {
    throw new Error(`Already exists: ${targetPath}`);
  }

  if (type === 'dir') {
    fs.mkdirSync(resolved, { recursive: true });
  } else {
    const dir = path.dirname(resolved);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolved, '', 'utf-8');
  }

  return { path: targetPath, type };
}

// ─── Delete file or folder ───────────────────────────────────

export function deleteFileOrFolder(projectRoot, targetPath) {
  const resolved = sanitizePath(projectRoot, targetPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Not found: ${targetPath}`);
  }

  // Prevent deleting the project root itself
  if (resolved === projectRoot) {
    throw new Error('Cannot delete project root');
  }

  // Prevent deleting CLAUDE.md
  if (path.basename(resolved) === 'CLAUDE.md' && path.dirname(resolved) === projectRoot) {
    throw new Error('Cannot delete project CLAUDE.md');
  }

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    fs.rmSync(resolved, { recursive: true });
  } else {
    fs.unlinkSync(resolved);
  }

  return { path: targetPath, deleted: true };
}
