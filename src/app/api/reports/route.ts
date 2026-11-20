import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
export async function GET(req: NextRequest) {
  const { error, context } = getTenantContext(req);
  if (error || !context) return error;

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branch_id') || undefined;

  const summary = db.getSummaryReport(context.tenantId, branchId);
  return NextResponse.json({ summary });
}
