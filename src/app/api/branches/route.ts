import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
export async function GET(req: NextRequest) {
  const { error, context } = getTenantContext(req);
  if (error || !context) return error;

  const branches = db.getBranches(context.tenantId);
  return NextResponse.json({ branches });
}
