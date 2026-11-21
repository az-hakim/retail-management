import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

/**
 * Optimistic gate only: it checks that a session cookie is present so
 * unauthenticated traffic never reaches a page or API handler. The token is
 * cryptographically verified and the user's role resolved in the route/server
 * layer (see `src/lib/tenant-context.ts`).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isAuthEndpoint = pathname.startsWith('/api/auth/');
  if (isAuthEndpoint || pathname === '/login') {
    return NextResponse.next();
  }

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf)$).*)',
  ],
};
