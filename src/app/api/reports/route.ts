import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext, branchScopeError } from '@/lib/tenant-context';
import { isBranchAllowed } from '@/lib/authz';

// Scope: Authenticated (tenant + branch scoped)
export async function GET(req: NextRequest) {
  const { error, context } = await getTenantContext(req);
  if (error || !context) return error;

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branch_id') || undefined;

  if (branchId && branchId !== 'ALL' && !isBranchAllowed(context.access, branchId)) {
    return branchScopeError(branchId);
  }

  const summary = db.getSummaryReport(context.tenantId, branchId);

  return NextResponse.json({ summary }, { headers: { 'Cache-Control': 'no-store' } });
}
