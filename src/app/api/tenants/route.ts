import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';
import { listAccessibleMemberships } from '@/lib/authz';

// Scope: Authenticated. Only tenants the signed-in user belongs to are returned.
export async function GET(req: NextRequest) {
  const { error, context } = await getTenantContext(req);
  if (error || !context) return error;

  const user = db.getUserById(context.user.id);
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const memberships = listAccessibleMemberships(user, db.getTenants());

  return NextResponse.json(
    {
      tenants: memberships.map(m => m.tenant),
      memberships,
      activeTenantId: context.tenantId,
      role: context.user.role,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PUT(req: NextRequest) {
  const { error, context } = await getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'SUPER_ADMIN'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();
    const updated = db.updateTenantSettings(context.tenantId, body?.settings ?? {});
    return NextResponse.json({ tenant: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update tenant settings.';
    return NextResponse.json({ error: 'UpdateFailed', message }, { status: 400 });
  }
}
