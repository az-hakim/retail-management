import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
// Requirements: ACID branch-to-branch inventory transfer with double ledger entries
export async function POST(req: NextRequest) {
  const { error, context } = getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();

    const result = db.transferStock(context.tenantId, {
      from_branch_id: body.from_branch_id,
      to_branch_id: body.to_branch_id,
      product_id: body.product_id,
      quantity: Number(body.quantity),
      notes: body.notes,
      user: context.user,
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: 'TransferFailed', message: err.message }, { status: 400 });
  }
}
