import { auth } from '../../../../lib/auth/config.js';
import { createProject, resolveProjectPath } from '../../../../lib/db/projects.js';
import { enforceRateLimit } from '../../../../lib/rate-limit.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// Accept only conservative URL shapes that a git hosting provider would produce.
// https://host[:port]/path — host must be alphanumeric + dots/dashes, port digits,
// path restricted to unreserved + a handful of safe separators. Rejects shell
// metacharacters like `$`, `` ` ``, `;`, `&`, `|`, `\`, newlines, spaces, quotes.
const HTTPS_URL = /^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?\/[A-Za-z0-9._~/@:-]+$/;
// ssh git URLs: user@host:owner/repo[.git]
const SSH_URL = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[A-Za-z0-9._/~-]+$/;

function isSafeRepoUrl(url) {
  return HTTPS_URL.test(url) || SSH_URL.test(url);
}

export async function POST(request) {
  const limited = enforceRateLimit(request, 'projects:clone', { limit: 5, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const repoUrl = (body.url || '').trim();
  const name = (body.name || '').trim();

  if (!repoUrl) return Response.json({ error: 'Repository URL is required' }, { status: 400 });

  if (!isSafeRepoUrl(repoUrl)) {
    return Response.json({ error: 'Invalid repository URL' }, { status: 400 });
  }

  // Extract repo name from URL if no name provided
  const repoName = name || repoUrl.split('/').pop().replace(/\.git$/, '') || 'cloned-project';

  // Temp clone path — project.id is a DB-assigned UUID, safe characters only,
  // but we still build the path via path.join and never inject into a shell.
  let project;
  let tempDir;
  try {
    project = createProject({
      userId: session.user.id,
      name: repoName,
      description: `Cloned from ${repoUrl}`,
    });

    const projectPath = resolveProjectPath(project.path);
    tempDir = path.join(os.tmpdir(), `ghostbot-clone-${project.id}`);

    // execFile with array args: no shell involvement, nothing the URL content
    // can do to escape. timeout + killSignal prevent hangs.
    await execFileAsync('git', ['clone', '--depth', '1', '--', repoUrl, tempDir], {
      timeout: 60_000,
      killSignal: 'SIGKILL',
    });

    // Copy contents into the project folder using fs, not a shell.
    // recursive + force mirrors `cp -r`.
    await fs.cp(tempDir, projectPath, { recursive: true, force: true });

    // Clean up the temp clone. rm recursive + force + maxRetries for races.
    await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 3 });

    return Response.json({ success: true, project });
  } catch (err) {
    // Best-effort cleanup of the temp dir on any failure
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
    return Response.json({ error: `Clone failed: ${err.message}` }, { status: 500 });
  }
}
