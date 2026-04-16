import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'ghostbot-config-v1';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

let cachedKey = null;
let fallbackWarned = false;

function getKey() {
  if (cachedKey) return cachedKey;

  // Prefer a dedicated ENCRYPTION_KEY. Splitting this from AUTH_SECRET
  // means rotating session signing keys (AUTH_SECRET) doesn't force
  // re-encryption of every secret in the DB, and a leak of AUTH_SECRET
  // doesn't automatically compromise stored API keys / PATs.
  //
  // For backward compatibility, fall back to AUTH_SECRET if
  // ENCRYPTION_KEY is unset. Existing installs keep working; new
  // installs should set both (same value or different — same is fine
  // as a starting point, different is better).
  const encKey = process.env.ENCRYPTION_KEY;
  const authSecret = process.env.AUTH_SECRET;

  const source = encKey || authSecret;
  if (!source) {
    throw new Error('ENCRYPTION_KEY or AUTH_SECRET is required for encryption');
  }

  if (!encKey && authSecret && !fallbackWarned) {
    console.warn(
      '[crypto] ENCRYPTION_KEY is unset — falling back to AUTH_SECRET for ' +
      'at-rest encryption. For stronger defense-in-depth, set a dedicated ' +
      'ENCRYPTION_KEY (openssl rand -base64 32) and re-save each secret ' +
      'via the admin UI to re-encrypt under the new key.',
    );
    fallbackWarned = true;
  }

  cachedKey = crypto.pbkdf2Sync(source, SALT, ITERATIONS, KEY_LENGTH, 'sha256');
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
