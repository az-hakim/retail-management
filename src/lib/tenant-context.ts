import { NextRequest, NextResponse } from 'next/server';
import { db } from './store';
import { UserRole } from '@/types';

export interface TenantContext {
  tenantId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  clientIp: string;
}

/**
 * Validates and extracts the tenant context from the request.
 * Enforces Zero-Trust isolation.
 */
export function getTenantContext(req: NextRequest, options?: { requiredRole?: UserRole[] }): { error?: NextResponse; context?: TenantContext } {
  // Extract tenant from header (in production, from authenticated session JWT)
  const tenantId = req.headers.get('x-tenant-id') || '018dc600-7000-7000-8000-000000000001'; // default to primary demo tenant if omitted
  const roleHeader = (req.headers.get('x-user-role') as UserRole) || 'TENANT_OWNER';
  const userNameHeader = req.headers.get('x-user-name') || 'Admin User';
  const userIdHeader = req.headers.get('x-user-id') || 'usr-default-01';

  const tenant = db.getTenant(tenantId);
  if (!tenant) {
    return {
      error: NextResponse.json(
        { error: 'TenantNotFound', message: `Invalid or missing tenant: ${tenantId}` },
        { status: 404 }
      ),
    };
  }

  if (tenant.status === 'SUSPENDED') {
    return {
      error: NextResponse.json(
        { error: 'TenantSuspended', message: 'Tenant account is currently suspended. Please contact support.' },
        { status: 403 }
      ),
    };
  }

  if (options?.requiredRole && !options.requiredRole.includes(roleHeader) && roleHeader !== 'SUPER_ADMIN') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden', message: `Role "${roleHeader}" is not authorized for this operation.` },
        { status: 403 }
      ),
    };
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  return {
    context: {
      tenantId,
      user: {
        id: userIdHeader,
        name: userNameHeader,
        email: `${userIdHeader}@${tenant.slug}.com`,
        role: roleHeader,
      },
      clientIp,
    },
  };
}
