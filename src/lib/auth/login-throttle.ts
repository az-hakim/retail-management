/**
 * In-memory login throttling. Keys are derived from the client IP and the
 * attempted email so a single attacker cannot grind one account or one origin.
 * Swap for Redis when running more than one instance.
 */
interface AttemptWindow {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

/**
 * Per-account limit is strict; the per-IP limit is higher so shared office or
 * carrier NAT addresses are not locked out by one person's typos while still
 * capping credential spraying.
 */
const MAX_FAILURES_BY_KIND: Record<string, number> = { email: 5, ip: 25 };
const MAX_KEYS = 10_000;

const attempts = new Map<string, AttemptWindow>();

function prune(now: number) {
  if (attempts.size <= MAX_KEYS) return;
  for (const [key, window] of attempts) {
    if (window.lockedUntil <= now && now - window.firstFailureAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loginKeys(ip: string, email: string): string[] {
  return [`ip:${ip}`, `email:${normalizeEmail(email)}`];
}

export function isThrottled(keys: string[]): { throttled: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  let retryAfterSeconds = 0;

  for (const key of keys) {
    const window = attempts.get(key);
    if (window && window.lockedUntil > now) {
      retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil((window.lockedUntil - now) / 1000));
    }
  }

  return { throttled: retryAfterSeconds > 0, retryAfterSeconds };
}

export function recordLoginFailure(keys: string[]) {
  const now = Date.now();
  prune(now);

  for (const key of keys) {
    const maxFailures = MAX_FAILURES_BY_KIND[key.split(':')[0]] ?? 5;
    const current = attempts.get(key);
    if (!current || now - current.firstFailureAt > WINDOW_MS) {
      attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
      continue;
    }
    current.failures += 1;
    if (current.failures >= maxFailures) {
      current.lockedUntil = now + LOCK_MS;
    }
  }
}

export function recordLoginSuccess(keys: string[]) {
  for (const key of keys) attempts.delete(key);
}

/** Test helper. */
export function resetThrottle() {
  attempts.clear();
}
