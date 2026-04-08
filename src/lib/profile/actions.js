'use server';

import { auth } from '../auth/config.js';
import { getUserById, updateUserProfile, getUserByEmail } from '../db/users.js';
import { publish } from '../sync/bus.js';

const MAX_AVATAR_BYTES = 256 * 1024; // 256 KB stored as data URL

async function requireSelf() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function getMyProfile() {
  const session = await requireSelf();

  // Primary lookup by id (from the JWT sub claim)
  let user = getUserById(session.user.id);

  // Fallback: the JWT id might be stale (cookie from a previous
  // DB instance) while the email in the JWT is still valid. If
  // so, look the user up by email instead and return that — the
  // next time they log out + back in the JWT will re-issue with
  // the right id.
  if (!user && session.user.email) {
    try {
      const { getUserByEmail } = await import('../db/users.js');
      user = getUserByEmail(session.user.email);
    } catch {}
  }

  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    country: user.country || '',
    avatarDataUrl: user.avatarDataUrl || '',
    createdAt: user.createdAt,
  };
}

export async function saveMyProfile({ firstName, lastName, country, avatarDataUrl, email }) {
  const session = await requireSelf();
  // Same fallback as getMyProfile — resolve by id first, then
  // fall back to email if the JWT id is stale.
  let me = getUserById(session.user.id);
  if (!me && session.user.email) {
    me = getUserByEmail(session.user.email);
  }
  if (!me) {
    return {
      success: false,
      error: 'Your session is stale — please sign out and sign back in.',
    };
  }

  // Light validation
  const fields = {};
  if (typeof firstName === 'string') fields.firstName = firstName.trim().slice(0, 60);
  if (typeof lastName === 'string') fields.lastName = lastName.trim().slice(0, 60);
  if (typeof country === 'string') fields.country = country.trim().slice(0, 60);

  if (typeof avatarDataUrl === 'string') {
    if (avatarDataUrl === '') {
      fields.avatarDataUrl = '';
    } else {
      if (!avatarDataUrl.startsWith('data:image/')) {
        return { success: false, error: 'Avatar must be an image' };
      }
      const approxBytes = Math.ceil((avatarDataUrl.length * 3) / 4);
      if (approxBytes > MAX_AVATAR_BYTES) {
        return {
          success: false,
          error: `Avatar too large (~${Math.round(approxBytes / 1024)} KB). Max ${Math.round(MAX_AVATAR_BYTES / 1024)} KB.`,
        };
      }
      fields.avatarDataUrl = avatarDataUrl;
    }
  }

  // Email change — only admins can change their own email.
  // Regular users contact an admin who edits via /admin/users.
  if (typeof email === 'string') {
    const trimmed = email.trim().toLowerCase();
    if (me.role !== 'admin') {
      return { success: false, error: 'Only admins can change their own email. Contact an admin.' };
    }
    if (!trimmed) {
      return { success: false, error: 'Email cannot be empty' };
    }
    // very light email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { success: false, error: 'Email is not a valid address' };
    }
    if (trimmed !== me.email) {
      // Uniqueness check
      const existing = getUserByEmail(trimmed);
      if (existing && existing.id !== me.id) {
        return { success: false, error: 'Another account already uses this email' };
      }
      fields.email = trimmed;
    }
  }

  try {
    // Always use the resolved row id, not session.user.id —
    // handles the stale-JWT case where the cookie id no longer
    // matches any row but the email still does.
    updateUserProfile(me.id, fields);
    publish(me.id, { type: 'profile:updated' });
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Failed to save profile' };
  }
}
