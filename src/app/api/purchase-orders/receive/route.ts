import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
// Requirements: Goods Received Note (GRN) updates stock and appends immutable PURCHASE_IN ledger
export async function POST(req: NextRequest) {
  const { error, context } = getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();

    const po = db.receivePurchaseOrderGRN(context.tenantId, {
      po_id: body.po_id,
      received_items: body.received_items,
      user: context.user,
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (err: any) {
    return NextResponse.json({ error: 'ReceiveGRNFailed', message: err.message }, { status: 400 });
  }
}
