import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getTenantContext } from '@/lib/tenant-context';

// Scope: TenantScoped
export async function GET(req: NextRequest) {
  const { error, context } = getTenantContext(req);
  if (error || !context) return error;

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branch_id') || undefined;
  const search = searchParams.get('search') || undefined;
  const categoryId = searchParams.get('category_id') || undefined;
  const barcode = searchParams.get('barcode');

  if (barcode) {
    const result = db.findProductByBarcode(context.tenantId, barcode);
    if (!result) {
      return NextResponse.json({ error: 'ProductNotFound', message: `No product found with barcode ${barcode}` }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const products = db.getProducts(context.tenantId, branchId, search, categoryId);
  const categories = db.getCategories(context.tenantId);

  return NextResponse.json({ products, categories });
}

export async function POST(req: NextRequest) {
  const { error, context } = getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK'],
  });
  if (error || !context) return error;

  try {
    const body = await req.json();
    const newProduct = db.createProduct(context.tenantId, body, context.user.name);
    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'CreateProductFailed', message: err.message }, { status: 400 });
  }
}
