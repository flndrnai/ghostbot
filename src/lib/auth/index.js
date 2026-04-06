export { handlers, signIn, signOut, auth } from './config.js';

export async function getPageAuthState() {
  const { auth } = await import('./config.js');
  const { getUserCount } = await import('../db/users.js');

  const [session, userCount] = await Promise.all([
    auth(),
    Promise.resolve(getUserCount()),
  ]);

  return { session, needsSetup: userCount === 0 };
}
