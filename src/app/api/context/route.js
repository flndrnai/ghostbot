import { auth } from '../../../lib/auth/config.js';
import {
  getOrCreateBusinessContext,
  getOrCreateVoiceContext,
  updateBusinessContext,
  updateVoiceContext,
} from '../../../lib/context/index.js';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    business: getOrCreateBusinessContext(),
    voice: getOrCreateVoiceContext(),
  });
}

export async function PUT(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, content } = await request.json();
  if (type === 'business') {
    updateBusinessContext(content);
  } else if (type === 'voice') {
    updateVoiceContext(content);
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
