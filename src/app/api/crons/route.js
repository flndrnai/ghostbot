import fs from 'fs';
import path from 'path';
import { auth } from '../../../lib/auth/config.js';
import { PROJECT_ROOT } from '../../../lib/paths.js';

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const filePath = path.join(PROJECT_ROOT, 'data/crons.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json([]);
  }
}
