'use server';

import { auth } from '../auth/config.js';
import {
  listUsers,
  deleteUserById,
  updateUserRole,
  updateUserProfile,
  resetUserPassword,
  createInvitation,
  listInvitations,
  deleteInvitation,
  getUserById,
  getUserByEmail,
} from '../db/users.js';
import { publish } from '../sync/bus.js';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return session;
}

export async function listUsersAction() {
  await requireAdmin();
  return listUsers();
}

export async function deleteUserAction(userId) {
  const session = await requireAdmin();
  if (userId === session.user.id) {
    return { success: false, error: "You can't delete your own account" };
  }
  deleteUserById(userId);
  return { success: true };
}

export async function updateUserRoleAction(userId, role) {
  await requireAdmin();
  if (role !== 'admin' && role !== 'user') {
    return { success: false, error: 'Invalid role' };
  }
  updateUserRole(userId, role);
  return { success: true };
}

export async function createInvitationAction({ email, role = 'user', expiresInDays = 7 }) {
  const session = await requireAdmin();
  if (!email?.trim() || !email.includes('@')) {
    return { success: false, error: 'Valid email required' };
  }
  const invite = createInvitation({
    email: email.trim().toLowerCase(),
    role: role === 'admin' ? 'admin' : 'user',
    invitedBy: session.user.id,
    expiresInDays: Math.max(1, Math.min(30, parseInt(expiresInDays, 10) || 7)),
  });
  return { success: true, ...invite };
}

export async function listInvitationsAction() {
  await requireAdmin();
  return listInvitations().map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt,
    acceptedAt: i.acceptedAt,
    createdAt: i.createdAt,
    token: i.token, // admin can see the token to copy the link
  }));
}

export async function deleteInvitationAction(id) {
  await requireAdmin();
  deleteInvitation(id);
  return { success: true };
}

// ─── Admin: edit a user's profile fields on their behalf ───

export async function adminUpdateUserAction(userId, { firstName, lastName, country, email, avatarDataUrl }) {
  const session = await requireAdmin();
  if (!userId) return { success: false, error: 'userId required' };

  const target = getUserById(userId);
  if (!target) return { success: false, error: 'User not found' };

  const fields = {};
  if (typeof firstName === 'string') fields.firstName = firstName.trim().slice(0, 60);
  if (typeof lastName === 'string') fields.lastName = lastName.trim().slice(0, 60);
  if (typeof country === 'string') fields.country = country.trim().slice(0, 60);

  if (typeof email === 'string') {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { success: false, error: 'Email cannot be empty' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { success: false, error: 'Email is not a valid address' };
    }
    if (trimmed !== target.email) {
      const existing = getUserByEmail(trimmed);
      if (existing && existing.id !== target.id) {
        return { success: false, error: 'Another account already uses this email' };
      }
      fields.email = trimmed;
    }
  }

  if (typeof avatarDataUrl === 'string') {
    if (avatarDataUrl === '') {
      fields.avatarDataUrl = '';
    } else if (avatarDataUrl.startsWith('data:image/')) {
      fields.avatarDataUrl = avatarDataUrl;
    }
  }

  try {
    updateUserProfile(userId, fields);
    // Tell the target user's open tabs to refresh their cached profile
    publish(userId, { type: 'profile:updated' });
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Failed to update user' };
  }
}

// ─── Admin: reset a user's password ───
// Generates a new random password, stores its bcrypt hash, and
// returns the plaintext to the admin once. The admin is expected
// to give it to the user any way they like (chat, email, paper).

function generateTempPassword() {
  // 16 random bytes -> 22 base64url chars. Strong enough for a
  // temporary credential the user is expected to change.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function adminResetUserPasswordAction(userId) {
  await requireAdmin();
  if (!userId) return { success: false, error: 'userId required' };
  const target = getUserById(userId);
  if (!target) return { success: false, error: 'User not found' };

  try {
    const newPassword = generateTempPassword();
    resetUserPassword(userId, newPassword);
    publish(userId, { type: 'profile:updated' });
    return { success: true, email: target.email, newPassword };
  } catch (err) {
    return { success: false, error: err?.message || 'Failed to reset password' };
  }
}

// Override the existing deleteUserAction with stricter sanity:
// admins can only delete OTHERS, not themselves AND not the very
// last admin in the system (to prevent locking everyone out).
export async function deleteUserActionStrict(userId) {
  const session = await requireAdmin();
  if (!userId) return { success: false, error: 'userId required' };
  if (userId === session.user.id) {
    return { success: false, error: "You can't delete your own account" };
  }
  // Don't let the last admin be deleted
  const all = listUsers();
  const target = all.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found' };
  if (target.role === 'admin') {
    const adminCount = all.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, error: "Can't delete the last admin" };
    }
  }
  deleteUserById(userId);
  return { success: true };
}

// Same sanity for role demotion
export async function updateUserRoleActionStrict(userId, role) {
  const session = await requireAdmin();
  if (role !== 'admin' && role !== 'user') {
    return { success: false, error: 'Invalid role' };
  }
  if (userId === session.user.id && role !== 'admin') {
    return { success: false, error: "You can't demote yourself" };
  }
  const all = listUsers();
  const target = all.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found' };
  if (target.role === 'admin' && role === 'user') {
    const adminCount = all.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, error: "Can't demote the last admin" };
    }
  }
  updateUserRole(userId, role);
  publish(userId, { type: 'profile:updated' });
  return { success: true };
}
