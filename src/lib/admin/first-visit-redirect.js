// Called from the root layout (or a shared server component) to send the
// owner to /setup exactly once per install. Marks the "first shown" flag
// so subsequent logins don't force-redirect again.
//
// Returns true if a redirect was issued (caller should stop rendering).

import { redirect } from 'next/navigation';
import { auth } from '../auth/config.js';
import { getWizardLifecycle, markFirstShown } from './wizard-state.js';

export async function maybeRedirectToSetup(currentPath) {
  if (currentPath === '/setup' || currentPath.startsWith('/login') || currentPath.startsWith('/api/') || currentPath.startsWith('/invite/')) {
    return false;
  }
  const session = await auth();
  if (!session?.user || session.user.owner !== 1) return false;

  const { firstShownAt } = getWizardLifecycle();
  if (firstShownAt) return false;

  markFirstShown();
  redirect('/setup');
}
