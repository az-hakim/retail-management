import { NextRequest, NextResponse } from 'next/server';
import { db } from './store';
import { Tenant, UserRole } from '@/types';
import { ResolvedAccess, hasRole, isBranchAllowed, resolveAccess } from './authz';
import { SESSION_COOKIE, verifySessionToken } from './auth/session';

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  access: ResolvedAccess;
  clientIp: string;
}

export interface AuthenticatedRequest {
  user: NonNullable<ReturnType<typeof db.getUserById>>;
  access: ResolvedAccess;
  clientIp: string;
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Cross-site request forgery guard for state-changing requests.
 * Browsers always send `Origin` on cross-site (and same-origin) non-GET calls,
 * so a mismatched or foreign origin is rejected outright.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return null;

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (origin) {
    try {
      if (host && new URL(origin).host !== host) {
        return NextResponse.json(
          { error: 'InvalidOrigin', message: 'Cross-origin request blocked.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'InvalidOrigin', message: 'Malformed Origin header.' },
        { status: 403 }
      );
    }
  }

  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
    return NextResponse.json(
      { error: 'CrossSiteRequestBlocked', message: 'Cross-site request blocked.' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Verifies the signed session cookie and resolves the effective tenant, role
 * and branch scope from server-side records. Client-supplied identity headers
 * are never trusted; `x-tenant-id` is only treated as a *request* to act in a
 * tenant the user actually belongs to.
 */
export async function getAuthenticatedRequest(
  req: NextRequest
): Promise<{ error?: NextResponse; auth?: AuthenticatedRequest }> {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return { error: csrfError };

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);

  if (!payload) {
    return {
      error: NextResponse.json(
        { error: 'Unauthenticated', message: 'Sign in to continue.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const user = db.getUserById(payload.sub);
  if (!user || !user.is_active) {
    return {
      error: NextResponse.json(
        { error: 'AccountDisabled', message: 'This account is not active.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const requestedTenantId = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id');
  const access = resolveAccess(user, requestedTenantId, db.getTenants());

  if (!access) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this workspace.' },
        { status: 403 }
      ),
    };
  }

  return { auth: { user, access, clientIp: getClientIp(req) } };
}

export async function getTenantContext(
  req: NextRequest,
  options?: { requiredRole?: UserRole[]; requiredBranchId?: string }
): Promise<{ error?: NextResponse; context?: TenantContext }> {
  const { error, auth } = await getAuthenticatedRequest(req);
  if (error || !auth) return { error };

  const { user, access, clientIp } = auth;

  if (options?.requiredRole && !hasRole(access, options.requiredRole)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden', message: `Role "${access.role}" is not authorized for this operation.` },
        { status: 403 }
      ),
    };
  }

  if (options?.requiredBranchId && !isBranchAllowed(access, options.requiredBranchId)) {
    return {
      error: NextResponse.json(
        { error: 'BranchForbidden', message: 'You are not authorized to operate in this branch.' },
        { status: 403 }
      ),
    };
  }

  return {
    context: {
      tenantId: access.tenant.id,
      tenant: access.tenant,
      user: { id: user.id, name: user.name, email: user.email, role: access.role },
      access,
      clientIp,
    },
  };
}

export function branchScopeError(branchId: unknown): NextResponse {
  return NextResponse.json(
    {
      error: 'BranchForbidden',
      message: `Branch "${String(branchId ?? '')}" is not available to this account.`,
    },
    { status: 403 }
  );
}
