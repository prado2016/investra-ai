// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptStoredSecret, encryptStoredSecret } from './credentialVault.js';

describe('credentialVault', () => {
  beforeEach(() => {
    process.env.EMAIL_CREDENTIALS_SECRET = 'test-email-secret';
  });

  afterEach(() => {
    delete process.env.EMAIL_CREDENTIALS_SECRET;
  });

  it('round-trips encrypted secrets', () => {
    const encrypted = encryptStoredSecret('mailbox-password');

    expect(encrypted.startsWith('enc:v1:')).toBe(true);
    expect(decryptStoredSecret(encrypted)).toBe('mailbox-password');
  });

  it('preserves legacy plaintext values for backward compatibility', () => {
    expect(decryptStoredSecret('legacy-plain-text')).toBe('legacy-plain-text');
  });
});
