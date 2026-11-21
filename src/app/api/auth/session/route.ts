import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { publicUser } from '@/lib/auth/session';
import { getAuthenticatedRequest } from '@/lib/tenant-context';
import { listAccessibleMemberships } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const { error, auth } = await getAuthenticatedRequest(req);
  if (error || !auth) return error;

  return NextResponse.json(
    {
      user: publicUser(auth.user),
      memberships: listAccessibleMemberships(auth.user, db.getTenants()),
      activeTenantId: auth.access.tenant.id,
      role: auth.access.role,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
