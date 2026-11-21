import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: Authenticated (tenant + branch scoped)
export async function GET(req: NextRequest) {
  const { error, context } = await getTenantContext(req);
  if (error || !context) return error;

  const allowed = context.access.allowedBranchIds;
  const branches = db
    .getBranches(context.tenantId)
    .filter(b => (allowed === null ? true : allowed.includes(b.id)));

  return NextResponse.json({ branches }, { headers: { 'Cache-Control': 'no-store' } });
}
