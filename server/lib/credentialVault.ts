import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const CREDENTIAL_PREFIX = 'enc:v1';

function getCredentialKey() {
  const secret = process.env.EMAIL_CREDENTIALS_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('EMAIL_CREDENTIALS_SECRET or BETTER_AUTH_SECRET must be set to store email credentials');
  }

  return createHash('sha256').update(secret).digest();
}

export function encryptStoredSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getCredentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    CREDENTIAL_PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptStoredSecret(value: string) {
  if (!value.startsWith(`${CREDENTIAL_PREFIX}:`)) {
    return value;
  }

  const [, , iv, authTag, encrypted] = value.split(':');
  if (!iv || !authTag || !encrypted) {
    throw new Error('Stored email credential is malformed');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getCredentialKey(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
