import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: Public / TenantScoped
export async function GET() {
  const tenants = db.getTenants();
  return NextResponse.json({ tenants });
}

export async function PUT(req: NextRequest) {
  const { error, context } = getTenantContext(req, { requiredRole: ['TENANT_OWNER', 'SUPER_ADMIN'] });
  if (error || !context) return error;

  try {
    const body = await req.json();
    const updated = db.updateTenantSettings(context.tenantId, body.settings);
    return NextResponse.json({ tenant: updated });
  } catch (err: any) {
    return NextResponse.json({ error: 'UpdateFailed', message: err.message }, { status: 400 });
  }
}
