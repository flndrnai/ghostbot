import { auth } from '../../../lib/auth/config.js';
import { listContainers, removeContainer } from '../../../lib/tools/docker.js';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const containers = await listContainers('ghostbot-');
    return Response.json(containers);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  if (!name) return Response.json({ error: 'Name required' }, { status: 400 });

  try {
    await removeContainer(name);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
