import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth/config.js';
import { getSetupState, markWizardFirstShown } from '../../lib/admin/setup-actions.js';
import SetupClient from './setup-client.jsx';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');
  if (session.user.owner !== 1) redirect('/admin');

  // Stamp the first-shown timestamp on every /setup GET — the helper
  // no-ops if already set.
  await markWizardFirstShown();

  const { lifecycle, status } = await getSetupState();

  return <SetupClient lifecycle={lifecycle} initialStatus={status} />;
}
