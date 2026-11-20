import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped (Restricted to Tenant Owner and Super Admin)
export async function GET(req: NextRequest) {
  const { error, context } = getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'SUPER_ADMIN'],
  });
  if (error || !context) return error;

  const logs = db.getAuditLogs(context.tenantId);
  return NextResponse.json({ logs });
}
