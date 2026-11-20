import { test, describe } from 'node:test';
import assert from 'node:assert';
import { db } from '../src/lib/store';
import { generateUUIDv7 } from '../src/lib/utils';

describe('Cross-Tenant Data Isolation & Security Guardrails', () => {
  const tenantAId = '018dc600-7000-7000-8000-000000000001'; // Apex Electronics
  const tenantBId = '018dc600-7000-7000-8000-000000000002'; // FreshMart Supermarket

  test('Tenant A cannot read products belonging to Tenant B', () => {
    const productsA = db.getProducts(tenantAId);
    const productsB = db.getProducts(tenantBId);

    assert.ok(productsA.length > 0, 'Tenant A should have products');
    assert.ok(productsB.length > 0, 'Tenant B should have products');

    // Verify all products in productsA strictly have tenant_id === tenantAId
    for (const p of productsA) {
      assert.strictEqual(p.tenant_id, tenantAId, `Product ${p.id} leaked into Tenant A`);
    }

    // Verify no product IDs overlap
    const idsA = new Set(productsA.map(p => p.id));
    for (const p of productsB) {
      assert.strictEqual(idsA.has(p.id), false, `Tenant B product ${p.id} visible in Tenant A`);
    }
  });

  test('Tenant A cannot lookup or access Tenant B product by barcode', () => {
    // FM-DAIRY-MILK-1L belongs to Tenant B
    const tenantBBarcode = '8909876543210';
    
    // When queried under Tenant A's context, must return null
    const resultUnderTenantA = db.findProductByBarcode(tenantAId, tenantBBarcode);
    assert.strictEqual(resultUnderTenantA, null, 'Tenant A must not be able to find Tenant B barcode');

    // When queried under Tenant B's context, must be found
    const resultUnderTenantB = db.findProductByBarcode(tenantBId, tenantBBarcode);
    assert.ok(resultUnderTenantB !== null, 'Tenant B should find its own barcode');
    assert.strictEqual(resultUnderTenantB?.product.sku, 'FM-DAIRY-MILK-1L');
  });

  test('POS checkout in Tenant A does not alter Tenant B stock levels', () => {
    const b1_t1 = '018dc600-7001-7000-8000-000000000001';
    const b1_t2 = '018dc600-7002-7000-8000-000000000001';

    const prodA = db.getProduct(tenantAId, 'prod-apex-03')!; // Anker Charger
    const prodB = db.getProduct(tenantBId, 'prod-fm-01')!; // Milk

    const initialStockA = prodA.stock_by_branch[b1_t1];
    const initialStockB = prodB.stock_by_branch[b1_t2];

    const idempotencyKey = generateUUIDv7();

    // Perform checkout in Tenant A
    db.checkoutPOS(tenantAId, {
      branch_id: b1_t1,
      idempotency_key: idempotencyKey,
      cashier: { id: 'test-cashier', name: 'Test Cashier' },
      items: [{ product_id: prodA.id, quantity: 2 }],
      payments: [{ method: 'CASH', amount: 200 }],
    });

    const updatedStockA = prodA.stock_by_branch[b1_t1];
    const updatedStockB = prodB.stock_by_branch[b1_t2];

    assert.strictEqual(updatedStockA, initialStockA - 2, 'Tenant A stock should decrease by 2');
    assert.strictEqual(updatedStockB, initialStockB, 'Tenant B stock must remain completely untouched');
  });

  test('Cross-tenant inventory transfer is strictly rejected', () => {
    const b1_t1 = '018dc600-7001-7000-8000-000000000001'; // Tenant A branch
    const b1_t2 = '018dc600-7002-7000-8000-000000000001'; // Tenant B branch

    assert.throws(
      () => {
        db.transferStock(tenantAId, {
          from_branch_id: b1_t1,
          to_branch_id: b1_t2, // illegal destination branch belonging to Tenant B
          product_id: 'prod-apex-01',
          quantity: 1,
          user: { id: 'attacker', name: 'Malicious Clerk' },
        });
      },
      /Branches not found in tenant/,
      'Cross-tenant transfer must throw authorization/not found error'
    );
  });

  test('Idempotent checkout prevents duplicate inventory deduction on flaky network', () => {
    const b1_t1 = '018dc600-7001-7000-8000-000000000001';
    const prod = db.getProduct(tenantAId, 'prod-apex-05')!; // Braided Cable
    const startStock = prod.stock_by_branch[b1_t1];

    const duplicateIdempotencyKey = generateUUIDv7();

    // Call 1
    const sale1 = db.checkoutPOS(tenantAId, {
      branch_id: b1_t1,
      idempotency_key: duplicateIdempotencyKey,
      cashier: { id: 'c1', name: 'Cashier 1' },
      items: [{ product_id: prod.id, quantity: 3 }],
      payments: [{ method: 'CASH', amount: 100 }],
    });

    const stockAfterFirst = prod.stock_by_branch[b1_t1];
    assert.strictEqual(stockAfterFirst, startStock - 3);

    // Call 2 with identical idempotency key (simulating retry after timeout)
    const sale2 = db.checkoutPOS(tenantAId, {
      branch_id: b1_t1,
      idempotency_key: duplicateIdempotencyKey,
      cashier: { id: 'c1', name: 'Cashier 1' },
      items: [{ product_id: prod.id, quantity: 3 }],
      payments: [{ method: 'CASH', amount: 100 }],
    });

    const stockAfterRetry = prod.stock_by_branch[b1_t1];

    assert.strictEqual(sale1.id, sale2.id, 'Both calls must return the identical sale object');
    assert.strictEqual(stockAfterRetry, stockAfterFirst, 'Duplicate idempotency call MUST NOT deduct stock twice');
  });

  test('Stock ledger is strictly partitioned by tenant_id', () => {
    const ledgerA = db.getLedger(tenantAId);
    for (const entry of ledgerA) {
      assert.strictEqual(entry.tenant_id, tenantAId, `Ledger entry ${entry.id} leaked into Tenant A`);
    }
  });
});
