'use server';

import { auth } from '../auth/config.js';
import { getUserById, updateUserProfile } from '../db/users.js';
import { publish } from '../sync/bus.js';

const MAX_AVATAR_BYTES = 256 * 1024; // 256 KB stored as data URL

async function requireSelf() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function getMyProfile() {
  const session = await requireSelf();
  const user = getUserById(session.user.id);
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

export async function saveMyProfile({ firstName, lastName, country, avatarDataUrl }) {
  const session = await requireSelf();

  // Light validation
  const fields = {};
  if (typeof firstName === 'string') fields.firstName = firstName.trim().slice(0, 60);
  if (typeof lastName === 'string') fields.lastName = lastName.trim().slice(0, 60);
  if (typeof country === 'string') fields.country = country.trim().slice(0, 60);

  if (typeof avatarDataUrl === 'string') {
    if (avatarDataUrl === '') {
      // Allow clearing
      fields.avatarDataUrl = '';
    } else {
      if (!avatarDataUrl.startsWith('data:image/')) {
        return { success: false, error: 'Avatar must be an image' };
      }
      // Approximate byte size of a base64 data URL
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

  try {
    updateUserProfile(session.user.id, fields);
    // Tell every open tab/device for this user to refresh its
    // cached profile view (sidebar avatar, dropdown header, etc.)
    publish(session.user.id, { type: 'profile:updated' });
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Failed to save profile' };
  }
}
