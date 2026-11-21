import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext, branchScopeError } from '@/lib/tenant-context';
import { isBranchAllowed } from '@/lib/authz';

// Scope: Authenticated (tenant + branch scoped)
// Requirements: ACID branch-to-branch transfer with double ledger entries
export async function POST(req: NextRequest) {
  const { error, context } = await getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();

    if (!isBranchAllowed(context.access, body?.from_branch_id)) {
      return branchScopeError(body?.from_branch_id);
    }
    if (!isBranchAllowed(context.access, body?.to_branch_id)) {
      return branchScopeError(body?.to_branch_id);
    }

    const result = db.transferStock(context.tenantId, {
      from_branch_id: body.from_branch_id,
      to_branch_id: body.to_branch_id,
      product_id: body.product_id,
      quantity: Number(body.quantity),
      notes: body.notes,
      user: { id: context.user.id, name: context.user.name },
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stock transfer failed.';
    return NextResponse.json({ error: 'TransferFailed', message }, { status: 400 });
  }
}
