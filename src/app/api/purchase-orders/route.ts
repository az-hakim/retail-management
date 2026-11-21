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

  const purchaseOrders = db.getPurchaseOrders(context.tenantId, branchId);
  const suppliers = db.getSuppliers(context.tenantId);

  return NextResponse.json(
    { purchaseOrders, suppliers },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const { error, context } = await getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();

    if (!isBranchAllowed(context.access, body?.branch_id)) {
      return branchScopeError(body?.branch_id);
    }

    const po = db.createPurchaseOrder(context.tenantId, body);
    return NextResponse.json({ success: true, purchaseOrder: po }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to create purchase order.';
    return NextResponse.json({ error: 'CreatePOFailed', message }, { status: 400 });
  }
}
