import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext, branchScopeError } from '@/lib/tenant-context';
import { isBranchAllowed } from '@/lib/authz';

// Scope: Authenticated (tenant + branch scoped)
// Requirements: Role check, mandatory reason, audit logging
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

    if (!body.reason || String(body.reason).trim().length < 5) {
      return NextResponse.json(
        {
          error: 'InvalidReason',
          message: 'A descriptive reason (min 5 characters) is mandatory for audit logging.',
        },
        { status: 400 }
      );
    }

    const result = db.adjustStock(context.tenantId, {
      branch_id: body.branch_id,
      product_id: body.product_id,
      variant_id: body.variant_id,
      new_quantity: Number(body.new_quantity),
      reason: body.reason,
      user: { id: context.user.id, name: context.user.name },
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stock adjustment failed.';
    return NextResponse.json({ error: 'AdjustmentFailed', message }, { status: 400 });
  }
}
