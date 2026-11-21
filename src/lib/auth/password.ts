import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing with scrypt (memory-hard, built into Node — no extra deps).
 * Format: scrypt$N$r$p$salt$derivedKey
 */
const PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 } as const;
const MAX_MEMORY = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize('NFKC'), salt, PARAMS.keyLength, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: MAX_MEMORY,
  });
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  try {
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    const actual = scryptSync(password.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEMORY,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * A valid hash for a random throwaway value. Verifying against this when an
 * account does not exist keeps failed-login timing uniform (no user enumeration).
 */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(24).toString('base64url'));
