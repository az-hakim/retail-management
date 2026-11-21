import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import {
  createSessionToken,
  isAuthConfigured,
  publicUser,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '@/lib/auth/session';
import { randomToken } from '@/lib/auth/token';
import { getClientIp } from '@/lib/tenant-context';
import {
  isThrottled,
  loginKeys,
  recordLoginFailure,
  recordLoginSuccess,
} from '@/lib/auth/login-throttle';
import { listAccessibleMemberships } from '@/lib/authz';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;

function noStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return noStore(
      {
        error: 'AuthNotConfigured',
        message:
          'Authentication is not configured on this deployment. Set AUTH_SESSION_SECRET (32+ characters) and redeploy.',
      },
      { status: 503 }
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return noStore({ error: 'InvalidBody', message: 'Expected a JSON body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return noStore(
      { error: 'MissingCredentials', message: 'Email and password are required.' },
      { status: 400 }
    );
  }

  if (
    email.length > MAX_EMAIL_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    !email.includes('@')
  ) {
    return noStore(
      { error: 'InvalidCredentials', message: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  const ip = getClientIp(req);
  const keys = loginKeys(ip, email);
  const throttle = isThrottled(keys);

  if (throttle.throttled) {
    return noStore(
      {
        error: 'TooManyAttempts',
        message: `Too many failed sign-in attempts. Try again in ${Math.ceil(
          throttle.retryAfterSeconds / 60
        )} minute(s).`,
      },
      { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
    );
  }

  const user = db.authenticate(email, password);
  if (!user) {
    recordLoginFailure(keys);
    return noStore(
      { error: 'InvalidCredentials', message: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  recordLoginSuccess(keys);

  const token = await createSessionToken(user.id, randomToken(16));
  const memberships = listAccessibleMemberships(user, db.getTenants());

  if (memberships.length === 0) {
    return noStore(
      { error: 'NoWorkspace', message: 'This account has no active workspace.' },
      { status: 403 }
    );
  }

  const response = noStore({
    user: publicUser(user),
    memberships,
    activeTenantId: memberships[0].tenant.id,
    role: memberships[0].role,
  });

  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
