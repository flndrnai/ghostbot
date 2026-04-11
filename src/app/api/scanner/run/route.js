import { auth } from '../../../../lib/auth/config.js';
import { runScanner } from '../../../../lib/scanner/run.js';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runScanner(session.user.id);
    if (!result) return NextResponse.json({ error: 'No data to analyze' }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
