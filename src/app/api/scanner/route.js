import { auth } from '../../../lib/auth/config.js';
import { listScannerResults } from '../../../lib/scanner/run.js';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const results = listScannerResults(session.user.id);
  return NextResponse.json({ results });
}
