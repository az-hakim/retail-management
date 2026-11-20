import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
// Requirements: Role check, Mandatory reason, Audit logging
export async function POST(req: NextRequest) {
  const { error, context } = getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();

    if (!body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'InvalidReason', message: 'A descriptive reason (min 5 characters) is mandatory for audit logging.' },
        { status: 400 }
      );
    }

    const result = db.adjustStock(context.tenantId, {
      branch_id: body.branch_id,
      product_id: body.product_id,
      variant_id: body.variant_id,
      new_quantity: Number(body.new_quantity),
      reason: body.reason,
      user: context.user,
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: 'AdjustmentFailed', message: err.message }, { status: 400 });
  }
}
