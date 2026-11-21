import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext, branchScopeError } from '@/lib/tenant-context';
import { isBranchAllowed } from '@/lib/authz';

// Scope: Authenticated (tenant + branch scoped)
// Requirements: Goods Received Note (GRN) updates stock and appends immutable PURCHASE_IN ledger
export async function POST(req: NextRequest) {
  const { error, context } = await getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();

    const po = db.getPurchaseOrders(context.tenantId).find(item => item.id === body?.po_id);
    if (!po) {
      return NextResponse.json(
        { error: 'PurchaseOrderNotFound', message: 'Purchase order not found.' },
        { status: 404 }
      );
    }

    if (!isBranchAllowed(context.access, po.branch_id)) {
      return branchScopeError(po.branch_id);
    }

    const received = db.receivePurchaseOrderGRN(context.tenantId, {
      po_id: body.po_id,
      received_items: body.received_items,
      user: { id: context.user.id, name: context.user.name },
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, purchaseOrder: received });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to receive goods.';
    return NextResponse.json({ error: 'ReceiveGRNFailed', message }, { status: 400 });
  }
}
