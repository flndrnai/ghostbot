'use server';

export async function setupAdmin(email, password) {
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Invalid email address' };
  }

  const { createFirstUser } = await import('../db/users.js');
  const result = createFirstUser(email, password);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

export async function acceptInviteAction({ token, password }) {
  if (!token || !password) return { error: 'Missing token or password' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const { acceptInvitation } = await import('../db/users.js');
  const result = acceptInvitation({ token, password });
  if (result.error) return { error: result.error };
  return { success: true, email: result.email, role: result.role };
}
