import { auth } from '../../../../lib/auth/config.js';
import { NextResponse } from 'next/server';
import { getPlanById, getStepsByPlan, updatePlan } from '../../../../lib/builder/db.js';
import { runBuilderPlan } from '../../../../lib/builder/runner.js';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId } = await params;
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const steps = getStepsByPlan(planId);
  return NextResponse.json({ ...plan, steps });
}

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId } = await params;
  const plan = getPlanById(planId);
  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const { action } = await request.json();

  if (action === 'start' || action === 'resume') {
    if (plan.status === 'running') {
      return NextResponse.json({ error: 'Plan is already running' }, { status: 400 });
    }
    runBuilderPlan(planId).catch((err) => {
      console.error('[builder] plan execution failed:', err);
      updatePlan(planId, { status: 'failed' });
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'pause') {
    updatePlan(planId, { status: 'paused' });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { deletePlan } = await import('../../../../lib/builder/db.js');
    deletePlan(planId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
