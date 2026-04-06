import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'ghostbot-config-v1';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required for encryption');

  cachedKey = crypto.pbkdf2Sync(secret, SALT, ITERATIONS, KEY_LENGTH, 'sha256');
  return cachedKey;
}

export function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return JSON.stringify({
    iv: iv.toString('base64'),
    ciphertext,
    tag,
  });
}

export function decrypt(encryptedJson) {
  const key = getKey();
  const { iv, ciphertext, tag } = JSON.parse(encryptedJson);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
