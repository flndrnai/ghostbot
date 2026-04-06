import { eq, count } from 'drizzle-orm';
import { hashSync, compareSync } from 'bcrypt-ts';
import { getDb } from './index.js';
import { users } from './schema.js';

export function getUserCount() {
  const db = getDb();
  const result = db.select({ count: count() }).from(users).get();
  return result?.count ?? 0;
}

export function getUserByEmail(email) {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();
}

export function createFirstUser(email, password) {
  const db = getDb();

  // Atomic transaction to prevent race conditions
  const result = db.transaction((tx) => {
    const existing = tx.select({ count: count() }).from(users).get();
    if (existing.count > 0) {
      return { error: 'Admin account already exists' };
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const passwordHash = hashSync(password, 10);

    tx.insert(users)
      .values({
        id,
        email: email.toLowerCase(),
        passwordHash,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return { success: true, id };
  });

  return result;
}

export function verifyPassword(user, password) {
  return compareSync(password, user.passwordHash);
}
