import { base64UrlDecode, base64UrlEncode, constantTimeEqual, hmacSign } from './token';
import { SESSION_COOKIE } from './constants';

export { SESSION_COOKIE };

/**
 * Stateless, signed session tokens (HMAC-SHA256).
 *
 * The token only carries identity (`sub`) and an opaque session id; the tenant,
 * role and branch scope are always re-resolved from the user record on the
 * server, so changing a user's role takes effect on the next request.
 */
export const SESSION_TTL_SECONDS = Math.max(
  900,
  Math.floor(Number(process.env.AUTH_SESSION_TTL_HOURS ?? 12) * 3600) || 12 * 3600
);

// Development-only fallback. Production refuses to mint tokens without a real secret.
const DEV_SECRET = 'omniretail-development-only-session-secret-do-not-use';

const MIN_SECRET_LENGTH = 32;

export function getSessionSecret(): string | null {
  const configured = process.env.AUTH_SESSION_SECRET;
  if (configured && configured.length >= MIN_SECRET_LENGTH) return configured;
  if (process.env.NODE_ENV !== 'production') return DEV_SECRET;
  return null;
}

export function isAuthConfigured(): boolean {
  return getSessionSecret() !== null;
}

export interface SessionPayload {
  /** User id. */
  sub: string;
  /** Opaque session id, useful for logging and future revocation lists. */
  sid: string;
  iat: number;
  exp: number;
}

export async function createSessionToken(userId: string, sessionId: string): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is not configured (minimum 32 characters).');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: userId,
    sid: sessionId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSign(secret, body);
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!body || !signature) return null;

  const expected = await hmacSign(secret, body);
  if (!constantTimeEqual(expected, signature)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as SessionPayload;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function publicUser<T extends { password_hash?: string }>(user: T): Omit<T, 'password_hash'> {
  const safe: T = { ...user };
  delete safe.password_hash;
  return safe;
}
