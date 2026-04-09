import { auth } from '../../../../lib/auth/config.js';
import { createProject, resolveProjectPath } from '../../../../lib/db/projects.js';
import { enforceRateLimit } from '../../../../lib/rate-limit.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request) {
  const limited = enforceRateLimit(request, 'projects:clone', { limit: 5, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const repoUrl = (body.url || '').trim();
  const name = (body.name || '').trim();

  if (!repoUrl) return Response.json({ error: 'Repository URL is required' }, { status: 400 });

  // Validate it looks like a git URL
  if (!repoUrl.match(/^https?:\/\/.+\/.+/) && !repoUrl.match(/^git@.+:.+/)) {
    return Response.json({ error: 'Invalid repository URL' }, { status: 400 });
  }

  // Extract repo name from URL if no name provided
  const repoName = name || repoUrl.split('/').pop().replace(/\.git$/, '') || 'cloned-project';

  try {
    // Create the project folder
    const project = createProject({
      userId: session.user.id,
      name: repoName,
      description: `Cloned from ${repoUrl}`,
    });

    const projectPath = resolveProjectPath(project.path);

    // Clone into the project folder (clone into a temp dir first, then move contents)
    await execAsync(`git clone --depth 1 ${JSON.stringify(repoUrl)} /tmp/ghostbot-clone-${project.id}`, {
      timeout: 60000, // 60s timeout
    });

    // Move contents (not .git initially, then .git)
    await execAsync(`cp -r /tmp/ghostbot-clone-${project.id}/. ${JSON.stringify(projectPath)}/`);
    await execAsync(`rm -rf /tmp/ghostbot-clone-${project.id}`);

    return Response.json({ success: true, project });
  } catch (err) {
    return Response.json({ error: `Clone failed: ${err.message}` }, { status: 500 });
  }
}
