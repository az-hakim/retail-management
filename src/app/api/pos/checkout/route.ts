import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
// Requirements: ACID Transaction, Mandatory X-Idempotency-Key
export async function POST(req: NextRequest) {
  const { error, context } = getTenantContext(req, {
    requiredRole: ['CASHIER', 'BRANCH_MANAGER', 'TENANT_OWNER'],
  });
  if (error || !context) return error;

  const idempotencyKey = req.headers.get('x-idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error: 'MissingIdempotencyKey',
        message: 'All POS checkout requests require an "X-Idempotency-Key" header to ensure network resilience and prevent double deductions.',
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    const sale = db.checkoutPOS(context.tenantId, {
      branch_id: body.branch_id,
      idempotency_key: idempotencyKey,
      cashier: context.user,
      customer: body.customer,
      items: body.items,
      discount_percent: body.discount_percent,
      discount_amount: body.discount_amount,
      payments: body.payments,
      ip_address: context.clientIp,
    });

    return NextResponse.json({ success: true, sale });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'CheckoutFailed', message: err.message || 'Error processing POS transaction' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { error, context } = getTenantContext(req);
  if (error || !context) return error;

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branch_id') || undefined;
  const sales = db.getSales(context.tenantId, branchId);

  return NextResponse.json({ sales });
}
