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
  const productId = searchParams.get('product_id') || undefined;

  if (branchId && branchId !== 'ALL' && !isBranchAllowed(context.access, branchId)) {
    return branchScopeError(branchId);
  }

  const entries = db.getLedger(context.tenantId, branchId, productId);
  return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'no-store' } });
}
