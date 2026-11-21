import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: Authenticated (tenant owner / manager / super admin only)
export async function GET(req: NextRequest) {
  const { error, context } = await getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'SUPER_ADMIN'],
  });
  if (error || !context) return error;

  const logs = db.getAuditLogs(context.tenantId);
  return NextResponse.json({ logs }, { headers: { 'Cache-Control': 'no-store' } });
}
