'use server';

import { auth } from '../auth/config.js';
import {
  listUsers,
  deleteUserById,
  updateUserRole,
  createInvitation,
  listInvitations,
  deleteInvitation,
} from '../db/users.js';

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
