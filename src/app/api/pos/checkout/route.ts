import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext, branchScopeError } from '@/lib/tenant-context';
import { isBranchAllowed } from '@/lib/authz';

// Scope: Authenticated
// Requirements: ACID transaction, mandatory X-Idempotency-Key
export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get('x-idempotency-key');

  const { error, context } = await getTenantContext(req, {
    requiredRole: ['CASHIER', 'BRANCH_MANAGER', 'TENANT_OWNER'],
  });
  if (error || !context) return error;

  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error: 'MissingIdempotencyKey',
        message:
          'All POS checkout requests require an "X-Idempotency-Key" header to ensure network resilience and prevent double deductions.',
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    if (!isBranchAllowed(context.access, body?.branch_id)) {
      return branchScopeError(body?.branch_id);
    }

    const sale = db.checkoutPOS(context.tenantId, {
      branch_id: body.branch_id,
      idempotency_key: idempotencyKey,
      cashier: { id: context.user.id, name: context.user.name },
      customer: body.customer,
      items: body.items,
      discount_percent: body.discount_percent,
      discount_amount: body.discount_amount,
      payments: body.payments,
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, sale });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error processing POS transaction';
    return NextResponse.json({ error: 'CheckoutFailed', message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { error, context } = await getTenantContext(req);
  if (error || !context) return error;

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branch_id') || undefined;

  if (branchId && branchId !== 'ALL' && !isBranchAllowed(context.access, branchId)) {
    return branchScopeError(branchId);
  }

  const sales = db.getSales(context.tenantId, branchId);

  return NextResponse.json({ sales }, { headers: { 'Cache-Control': 'no-store' } });
}
