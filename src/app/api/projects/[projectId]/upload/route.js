import { auth } from '../../../../../lib/auth/config.js';
import { getProjectById, resolveProjectPath } from '../../../../../lib/db/projects.js';
import { enforceRateLimit } from '../../../../../lib/rate-limit.js';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB total per upload

export async function POST(request, { params }) {
  const limited = enforceRateLimit(request, 'files:upload', { limit: 10, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (project.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const projectRoot = resolveProjectPath(project.path);

  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    let totalSize = 0;
    const uploaded = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // webkitRelativePath preserves folder structure from directory upload
      const relativePath = file.webkitRelativePath || file.name;

      // Security: reject path traversal
      if (relativePath.includes('..')) {
        errors.push(`${relativePath}: path traversal rejected`);
        continue;
      }

      // Skip common junk
      const parts = relativePath.split('/');
      if (parts.some((p) => p === 'node_modules' || p === '.git' || p === '.next' || p === '__pycache__' || p === '.DS_Store')) {
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${relativePath}: exceeds 5 MB limit`);
        continue;
      }

      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        errors.push('Total upload size exceeds 50 MB limit');
        break;
      }

      const targetPath = path.join(projectRoot, relativePath);
      const targetDir = path.dirname(targetPath);

      // Verify the resolved path stays inside the project
      const resolved = path.resolve(targetPath);
      if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
        errors.push(`${relativePath}: path outside project`);
        continue;
      }

      fs.mkdirSync(targetDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
      uploaded.push(relativePath);
    }

    return Response.json({
      success: true,
      uploaded: uploaded.length,
      errors: errors.length ? errors : undefined,
      files: uploaded,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
