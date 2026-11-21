import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';
import { assertSameOrigin } from '@/lib/tenant-context';

export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  // Overwrite with an expired cookie. Stateless tokens are not server-revocable,
  // so the cookie is the unit of session lifetime.
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
