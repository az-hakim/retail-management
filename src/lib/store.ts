import {
  Tenant,
  Branch,
  ProductVariant,
  User,
  Category,
  Product,
  StockLedgerEntry,
  Sale,
  SaleItem,
  Supplier,
  PurchaseOrder,
  AuditLog,
  PaymentEntry,
} from '@/types';
import { generateUUIDv7 } from './utils';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from './auth/password';
import { normalizeEmail } from './auth/login-throttle';

// Global in-memory storage (persisted across requests during server lifetime)
// Can be backed by PostgreSQL / Prisma when DATABASE_URL is present.

export interface StoreData {
  tenants: Tenant[];
  branches: Branch[];
  users: User[];
  categories: Category[];
  products: Product[];
  ledger: StockLedgerEntry[];
  sales: Sale[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  auditLogs: AuditLog[];
  idempotencyKeys: Map<string, string>; // idempotencyKey -> saleId
}

function initializeSeedData(): StoreData {
  const t1Id = '018dc600-7000-7000-8000-000000000001'; // Apex Electronics
  const t2Id = '018dc600-7000-7000-8000-000000000002'; // FreshMart Supermarket
  const t3Id = '018dc600-7000-7000-8000-000000000003'; // Nova Health Pharmacy

  const b1_t1 = '018dc600-7001-7000-8000-000000000001';
  const b2_t1 = '018dc600-7001-7000-8000-000000000002';

  const b1_t2 = '018dc600-7002-7000-8000-000000000001';
  const b2_t2 = '018dc600-7002-7000-8000-000000000002';

  const b1_t3 = '018dc600-7003-7000-8000-000000000001';

  const tenants: Tenant[] = [
    {
      id: t1Id,
      name: 'Apex Electronics & Gear',
      slug: 'apex-electronics',
      plan: 'GROWTH',
      status: 'ACTIVE',
      created_at: '2026-01-10T08:00:00Z',
      settings: {
        currency_code: 'USD',
        currency_symbol: '$',
        timezone: 'America/New_York',
        tax_config: {
          enabled: true,
          inclusive: false,
          default_rate: 8.5,
          tax_id_label: 'Sales Tax',
        },
        low_stock_threshold_default: 5,
        receipt_footer_text: 'Thank you for choosing Apex Electronics! 1-year warranty on original tech.',
        allow_negative_stock: false,
        batch_tracking_enabled: false,
      },
    },
    {
      id: t2Id,
      name: 'FreshMart Supermarket',
      slug: 'freshmart',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      created_at: '2026-02-15T09:30:00Z',
      settings: {
        currency_code: 'USD',
        currency_symbol: '$',
        timezone: 'America/Chicago',
        tax_config: {
          enabled: true,
          inclusive: true,
          default_rate: 5.0,
          tax_id_label: 'VAT',
        },
        low_stock_threshold_default: 10,
        receipt_footer_text: 'Farm fresh goodness every day. Returns accepted within 24 hours for fresh produce.',
        allow_negative_stock: true,
        batch_tracking_enabled: true,
      },
    },
    {
      id: t3Id,
      name: 'Nova Health & Pharma',
      slug: 'nova-pharma',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      created_at: '2026-03-01T10:00:00Z',
      settings: {
        currency_code: 'USD',
        currency_symbol: '$',
        timezone: 'America/Los_Angeles',
        tax_config: {
          enabled: false,
          inclusive: false,
          default_rate: 0.0,
          tax_id_label: 'Medical Exemption',
        },
        low_stock_threshold_default: 15,
        receipt_footer_text: 'Licensed pharmacy dispensary. Please keep medications safely stored out of reach of children.',
        allow_negative_stock: false,
        batch_tracking_enabled: true,
      },
    },
  ];

  const branches: Branch[] = [
    {
      id: b1_t1,
      tenant_id: t1Id,
      name: 'Flagship Downtown Store',
      code: 'BR-APEX-01',
      address: '742 Broadway Ave, Suite 100, New York, NY',
      phone: '+1 (212) 555-0199',
      is_main: true,
    },
    {
      id: b2_t1,
      tenant_id: t1Id,
      name: 'Airport Express Terminal 4',
      code: 'BR-APEX-02',
      address: 'JFK Airport Terminal 4, Gate B22, Queens, NY',
      phone: '+1 (718) 555-0144',
      is_main: false,
    },
    {
      id: b1_t2,
      tenant_id: t2Id,
      name: 'FreshMart Central Mall',
      code: 'BR-FM-01',
      address: '1200 Lakeview Blvd, Chicago, IL',
      phone: '+1 (312) 555-8833',
      is_main: true,
    },
    {
      id: b2_t2,
      tenant_id: t2Id,
      name: 'Westside Community Outlet',
      code: 'BR-FM-02',
      address: '450 Western Ave, Chicago, IL',
      phone: '+1 (312) 555-7722',
      is_main: false,
    },
    {
      id: b1_t3,
      tenant_id: t3Id,
      name: 'Nova Health Central Pharmacy',
      code: 'BR-NH-01',
      address: '880 Medical Center Blvd, Los Angeles, CA',
      phone: '+1 (310) 555-9011',
      is_main: true,
    },
  ];

  // Seed accounts share one password so the demo can be signed into.
  // In production a real secret is required; otherwise a random per-boot
  // password is generated and the accounts are effectively unusable.
  const seedPassword =
    process.env.AUTH_SEED_PASSWORD ||
    (process.env.NODE_ENV === 'production' ? generateUUIDv7() + generateUUIDv7() : 'DemoPass123!');

  const users: User[] = [
    {
      id: '018dc600-7010-7000-8000-000000000001',
      tenant_id: t1Id,
      name: 'Alexander Wright',
      email: 'alex@apexgear.com',
      role: 'TENANT_OWNER',
      is_active: true,
      memberships: [{ tenant_id: t1Id, role: 'TENANT_OWNER' }],
      password_hash: hashPassword(seedPassword),
    },
    {
      id: '018dc600-7010-7000-8000-000000000002',
      tenant_id: t1Id,
      branch_id: b1_t1,
      name: 'Sarah Chen',
      email: 'sarah.cashier@apexgear.com',
      role: 'CASHIER',
      is_active: true,
      memberships: [{ tenant_id: t1Id, role: 'CASHIER', branch_id: b1_t1 }],
      password_hash: hashPassword(seedPassword),
    },
    {
      id: '018dc600-7010-7000-8000-000000000003',
      tenant_id: t1Id,
      name: 'Marcus Vance',
      email: 'marcus.stock@apexgear.com',
      role: 'INVENTORY_CLERK',
      is_active: true,
      memberships: [{ tenant_id: t1Id, role: 'INVENTORY_CLERK' }],
      password_hash: hashPassword(seedPassword),
    },
    {
      id: '018dc600-7010-7000-8000-000000000004',
      tenant_id: t2Id,
      name: 'Priya Raman',
      email: 'owner@freshmart.com',
      role: 'TENANT_OWNER',
      is_active: true,
      memberships: [{ tenant_id: t2Id, role: 'TENANT_OWNER' }],
      password_hash: hashPassword(seedPassword),
    },
    {
      id: '018dc600-7010-7000-8000-000000000005',
      tenant_id: t3Id,
      name: 'Rachel Patel',
      email: 'owner@novapharma.com',
      role: 'TENANT_OWNER',
      is_active: true,
      memberships: [{ tenant_id: t3Id, role: 'TENANT_OWNER' }],
      password_hash: hashPassword(seedPassword),
    },
    {
      id: '018dc600-7010-7000-8000-000000000006',
      tenant_id: t1Id,
      name: 'Platform Admin',
      email: 'admin@omniretail.app',
      role: 'SUPER_ADMIN',
      is_active: true,
      memberships: [],
      password_hash: hashPassword(seedPassword),
    },
  ];

  const categories: Category[] = [
    // Apex
    { id: 'cat-t1-1', tenant_id: t1Id, name: 'Smartphones & Tablets', slug: 'smartphones', icon: 'Smartphone' },
    { id: 'cat-t1-2', tenant_id: t1Id, name: 'Audio & Headphones', slug: 'audio', icon: 'Headphones' },
    { id: 'cat-t1-3', tenant_id: t1Id, name: 'Accessories & Cables', slug: 'accessories', icon: 'Cable' },
    { id: 'cat-t1-4', tenant_id: t1Id, name: 'Computing & Peripherals', slug: 'computing', icon: 'Laptop' },
    // FreshMart
    { id: 'cat-t2-1', tenant_id: t2Id, name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: 'Egg' },
    { id: 'cat-t2-2', tenant_id: t2Id, name: 'Fresh Produce & Fruits', slug: 'fresh-produce', icon: 'Apple' },
    { id: 'cat-t2-3', tenant_id: t2Id, name: 'Bakery & Bread', slug: 'bakery', icon: 'Croissant' },
    { id: 'cat-t2-4', tenant_id: t2Id, name: 'Pantry & Grains', slug: 'pantry', icon: 'Utensils' },
    // Nova Pharma
    { id: 'cat-t3-1', tenant_id: t3Id, name: 'Pain Relief & Fever', slug: 'pain-relief', icon: 'Pill' },
    { id: 'cat-t3-2', tenant_id: t3Id, name: 'Antibiotics & Rx', slug: 'antibiotics', icon: 'Activity' },
    { id: 'cat-t3-3', tenant_id: t3Id, name: 'Vitamins & Supplements', slug: 'vitamins', icon: 'ShieldCheck' },
    { id: 'cat-t3-4', tenant_id: t3Id, name: 'First Aid & Medical Devices', slug: 'first-aid', icon: 'HeartPulse' },
  ];

  const products: Product[] = [
    // APEX ELECTRONICS PRODUCTS
    {
      id: 'prod-apex-01',
      tenant_id: t1Id,
      sku: 'APX-IPHONE15-PRO',
      barcode: '8901234567890',
      name: 'Apple iPhone 15 Pro 128GB',
      category_id: 'cat-t1-1',
      category_name: 'Smartphones & Tablets',
      unit_of_measure: 'pcs',
      cost_price: 780.0,
      retail_price: 999.0,
      reorder_level: 4,
      has_variants: true,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t1]: 14,
        [b2_t1]: 5,
      },
      variants: [
        {
          id: 'var-apex-01-a',
          product_id: 'prod-apex-01',
          sku: 'APX-IPHONE15-PRO-BLK',
          barcode: '8901234567891',
          name: 'Black Titanium 128GB',
          cost_price: 780.0,
          retail_price: 999.0,
        },
        {
          id: 'var-apex-01-b',
          product_id: 'prod-apex-01',
          sku: 'APX-IPHONE15-PRO-NAT',
          barcode: '8901234567892',
          name: 'Natural Titanium 256GB',
          cost_price: 860.0,
          retail_price: 1099.0,
        },
      ],
    },
    {
      id: 'prod-apex-02',
      tenant_id: t1Id,
      sku: 'APX-SONY-WH1000XM5',
      barcode: '8901234567893',
      name: 'Sony WH-1000XM5 Wireless Headphones',
      category_id: 'cat-t1-2',
      category_name: 'Audio & Headphones',
      unit_of_measure: 'pcs',
      cost_price: 240.0,
      retail_price: 398.0,
      reorder_level: 5,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t1]: 18,
        [b2_t1]: 6,
      },
    },
    {
      id: 'prod-apex-03',
      tenant_id: t1Id,
      sku: 'APX-ANKER-65W-GAN',
      barcode: '8901234567894',
      name: 'Anker Prime 65W GaN Fast Charger',
      category_id: 'cat-t1-3',
      category_name: 'Accessories & Cables',
      unit_of_measure: 'pcs',
      cost_price: 28.5,
      retail_price: 59.99,
      reorder_level: 10,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t1]: 45,
        [b2_t1]: 20,
      },
    },
    {
      id: 'prod-apex-04',
      tenant_id: t1Id,
      sku: 'APX-LOGI-MX3S',
      barcode: '8901234567895',
      name: 'Logitech MX Master 3S Wireless Mouse',
      category_id: 'cat-t1-4',
      category_name: 'Computing & Peripherals',
      unit_of_measure: 'pcs',
      cost_price: 62.0,
      retail_price: 99.99,
      reorder_level: 6,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t1]: 12,
        [b2_t1]: 3, // Low stock alert!
      },
    },
    {
      id: 'prod-apex-05',
      tenant_id: t1Id,
      sku: 'APX-CABLE-USBC-2M',
      barcode: '8901234567896',
      name: 'Braided USB-C to USB-C 100W Cable (2m)',
      category_id: 'cat-t1-3',
      category_name: 'Accessories & Cables',
      unit_of_measure: 'pcs',
      cost_price: 4.2,
      retail_price: 19.99,
      reorder_level: 15,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t1]: 75,
        [b2_t1]: 30,
      },
    },
    {
      id: 'prod-apex-06',
      tenant_id: t1Id,
      sku: 'APX-SAM-WATCH6',
      barcode: '8901234567897',
      name: 'Samsung Galaxy Watch 6 Bluetooth 44mm',
      category_id: 'cat-t1-1',
      category_name: 'Smartphones & Tablets',
      unit_of_measure: 'pcs',
      cost_price: 180.0,
      retail_price: 299.99,
      reorder_level: 3,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t1]: 2, // Low stock alert!
        [b2_t1]: 4,
      },
    },

    // FRESHMART SUPERMARKET PRODUCTS
    {
      id: 'prod-fm-01',
      tenant_id: t2Id,
      sku: 'FM-DAIRY-MILK-1L',
      barcode: '8909876543210',
      name: 'Organic Whole Dairy Milk 1L',
      category_id: 'cat-t2-1',
      category_name: 'Dairy & Eggs',
      unit_of_measure: 'liter',
      cost_price: 2.1,
      retail_price: 3.89,
      reorder_level: 25,
      has_variants: false,
      track_batch_expiry: true,
      stock_by_branch: {
        [b1_t2]: 60,
        [b2_t2]: 15,
      },
      batches: [
        {
          id: 'batch-fm-m1',
          product_id: 'prod-fm-01',
          branch_id: b1_t2,
          batch_number: 'MILK-2026-N20',
          manufacturing_date: '2026-11-15',
          expiry_date: '2026-11-28', // Expiring in 8 days!
          quantity: 25,
          cost_price: 2.1,
        },
        {
          id: 'batch-fm-m2',
          product_id: 'prod-fm-01',
          branch_id: b1_t2,
          batch_number: 'MILK-2026-N22',
          manufacturing_date: '2026-11-18',
          expiry_date: '2026-12-05',
          quantity: 35,
          cost_price: 2.1,
        },
      ],
    },
    {
      id: 'prod-fm-02',
      tenant_id: t2Id,
      sku: 'FM-EGGS-FARM-12',
      barcode: '8909876543211',
      name: 'Farm Fresh Brown Eggs (12-pack)',
      category_id: 'cat-t2-1',
      category_name: 'Dairy & Eggs',
      unit_of_measure: 'box',
      cost_price: 2.8,
      retail_price: 4.99,
      reorder_level: 20,
      has_variants: false,
      track_batch_expiry: true,
      stock_by_branch: {
        [b1_t2]: 80,
        [b2_t2]: 35,
      },
    },
    {
      id: 'prod-fm-03',
      tenant_id: t2Id,
      sku: 'FM-PROD-APPLES-GALA',
      barcode: '8909876543212',
      name: 'Crisp Royal Gala Apples (1 kg)',
      category_id: 'cat-t2-2',
      category_name: 'Fresh Produce & Fruits',
      unit_of_measure: 'kg',
      cost_price: 1.5,
      retail_price: 3.25,
      reorder_level: 15,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t2]: 45,
        [b2_t2]: 22,
      },
    },
    {
      id: 'prod-fm-04',
      tenant_id: t2Id,
      sku: 'FM-BAKE-SOURDOUGH',
      barcode: '8909876543213',
      name: 'Artisan Country Sourdough Loaf',
      category_id: 'cat-t2-3',
      category_name: 'Bakery & Bread',
      unit_of_measure: 'pcs',
      cost_price: 2.2,
      retail_price: 5.5,
      reorder_level: 10,
      has_variants: false,
      track_batch_expiry: true,
      stock_by_branch: {
        [b1_t2]: 8, // Low stock alert!
        [b2_t2]: 12,
      },
    },

    // NOVA HEALTH PHARMACY PRODUCTS
    {
      id: 'prod-nova-01',
      tenant_id: t3Id,
      sku: 'NH-PARA-500MG-100',
      barcode: '8905551234001',
      name: 'Paracetamol 500mg Caplets (100-pack)',
      category_id: 'cat-t3-1',
      category_name: 'Pain Relief & Fever',
      unit_of_measure: 'box',
      cost_price: 4.5,
      retail_price: 9.95,
      reorder_level: 25,
      has_variants: false,
      track_batch_expiry: true,
      stock_by_branch: {
        [b1_t3]: 110,
      },
      batches: [
        {
          id: 'batch-nh-01',
          product_id: 'prod-nova-01',
          branch_id: b1_t3,
          batch_number: 'BN-PARA-2408',
          manufacturing_date: '2024-08-01',
          expiry_date: '2026-12-15', // FEFO: First Expired, First Out!
          quantity: 40,
          cost_price: 4.5,
        },
        {
          id: 'batch-nh-02',
          product_id: 'prod-nova-01',
          branch_id: b1_t3,
          batch_number: 'BN-PARA-2501',
          manufacturing_date: '2025-01-10',
          expiry_date: '2027-06-30',
          quantity: 70,
          cost_price: 4.5,
        },
      ],
    },
    {
      id: 'prod-nova-02',
      tenant_id: t3Id,
      sku: 'NH-AMOX-250MG-SUSP',
      barcode: '8905551234002',
      name: 'Amoxicillin 250mg Oral Suspension 100ml',
      category_id: 'cat-t3-2',
      category_name: 'Antibiotics & Rx',
      unit_of_measure: 'box',
      cost_price: 8.2,
      retail_price: 18.5,
      reorder_level: 15,
      has_variants: false,
      track_batch_expiry: true,
      stock_by_branch: {
        [b1_t3]: 32,
      },
    },
    {
      id: 'prod-nova-03',
      tenant_id: t3Id,
      sku: 'NH-DIGI-THERMO',
      barcode: '8905551234003',
      name: 'Digital Infrared Medical Thermometer',
      category_id: 'cat-t3-4',
      category_name: 'First Aid & Medical Devices',
      unit_of_measure: 'pcs',
      cost_price: 14.0,
      retail_price: 34.99,
      reorder_level: 5,
      has_variants: false,
      track_batch_expiry: false,
      stock_by_branch: {
        [b1_t3]: 14,
      },
    },
  ];

  const ledger: StockLedgerEntry[] = [
    {
      id: 'led-init-01',
      tenant_id: t1Id,
      branch_id: b1_t1,
      branch_name: 'Flagship Downtown Store',
      product_id: 'prod-apex-01',
      product_name: 'Apple iPhone 15 Pro 128GB',
      sku: 'APX-IPHONE15-PRO',
      movement_type: 'PURCHASE_IN',
      quantity_delta: 20,
      balance_after: 20,
      cost_price_at_time: 780.0,
      reference_id: 'PO-APX-INIT-01',
      notes: 'Initial warehouse stock receipt',
      created_by_user: 'Alexander Wright',
      created_at: '2026-11-01T10:00:00Z',
    },
    {
      id: 'led-init-02',
      tenant_id: t1Id,
      branch_id: b1_t1,
      branch_name: 'Flagship Downtown Store',
      product_id: 'prod-apex-01',
      product_name: 'Apple iPhone 15 Pro 128GB',
      sku: 'APX-IPHONE15-PRO',
      movement_type: 'TRANSFER_OUT',
      quantity_delta: -5,
      balance_after: 15,
      cost_price_at_time: 780.0,
      reference_id: 'TR-APX-001',
      notes: 'Stock transfer to Airport Express',
      created_by_user: 'Alexander Wright',
      created_at: '2026-11-05T14:30:00Z',
    },
    {
      id: 'led-init-03',
      tenant_id: t1Id,
      branch_id: b2_t1,
      branch_name: 'Airport Express Terminal 4',
      product_id: 'prod-apex-01',
      product_name: 'Apple iPhone 15 Pro 128GB',
      sku: 'APX-IPHONE15-PRO',
      movement_type: 'TRANSFER_IN',
      quantity_delta: 5,
      balance_after: 5,
      cost_price_at_time: 780.0,
      reference_id: 'TR-APX-001',
      notes: 'Received stock transfer from Flagship Downtown',
      created_by_user: 'Sarah Chen',
      created_at: '2026-11-05T16:00:00Z',
    },
    {
      id: 'led-init-04',
      tenant_id: t1Id,
      branch_id: b1_t1,
      branch_name: 'Flagship Downtown Store',
      product_id: 'prod-apex-01',
      product_name: 'Apple iPhone 15 Pro 128GB',
      sku: 'APX-IPHONE15-PRO',
      movement_type: 'SALE_OUT',
      quantity_delta: -1,
      balance_after: 14,
      cost_price_at_time: 780.0,
      reference_id: 'INV-202611-0001',
      notes: 'Retail POS Sale',
      created_by_user: 'Sarah Chen',
      created_at: '2026-11-18T11:20:00Z',
    },
  ];

  const sales: Sale[] = [
    {
      id: 'sale-apex-001',
      tenant_id: t1Id,
      branch_id: b1_t1,
      invoice_number: 'INV-202611-0001',
      idempotency_key: '018dc600-7099-7000-8000-000000000001',
      cashier_id: '018dc600-7010-7000-8000-000000000002',
      cashier_name: 'Sarah Chen',
      customer_name: 'David Miller',
      customer_phone: '+1 (212) 555-4321',
      items: [
        {
          id: 'item-sale-01',
          product_id: 'prod-apex-01',
          product_name: 'Apple iPhone 15 Pro 128GB',
          sku: 'APX-IPHONE15-PRO',
          barcode: '8901234567890',
          unit_price: 999.0,
          cost_price: 780.0,
          quantity: 1,
          total_price: 999.0,
        },
        {
          id: 'item-sale-02',
          product_id: 'prod-apex-05',
          product_name: 'Braided USB-C to USB-C 100W Cable (2m)',
          sku: 'APX-CABLE-USBC-2M',
          barcode: '8901234567896',
          unit_price: 19.99,
          cost_price: 4.2,
          quantity: 1,
          total_price: 19.99,
        },
      ],
      subtotal: 1018.99,
      discount_amount: 0,
      discount_percent: 0,
      tax_rate: 8.5,
      tax_amount: 86.61,
      total_amount: 1105.6,
      payments: [
        {
          method: 'CARD',
          amount: 1105.6,
          reference: 'AUTH-VISA-9821',
        },
      ],
      change_given: 0,
      status: 'COMPLETED',
      created_at: '2026-11-18T11:20:00Z',
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup-t1-01',
      tenant_id: t1Id,
      name: 'Apple Authorized Wholesale Distribution',
      contact_name: 'Jessica Vance',
      email: 'jvance@applewholesale.com',
      phone: '+1 (800) 555-8822',
      balance_payable: 15600.0,
    },
    {
      id: 'sup-t1-02',
      tenant_id: t1Id,
      name: 'Anker Global Supply Network',
      contact_name: 'David Zhang',
      email: 'dzhang@ankerpartner.com',
      phone: '+1 (888) 555-7744',
      balance_payable: 3200.0,
    },
    {
      id: 'sup-t2-01',
      tenant_id: t2Id,
      name: 'Midwest Dairy Co-op',
      contact_name: 'Tom Bradley',
      email: 'tom@midwestdairy.org',
      phone: '+1 (312) 555-3344',
      balance_payable: 2450.0,
    },
    {
      id: 'sup-t3-01',
      tenant_id: t3Id,
      name: 'Amerisource Health Logistics',
      contact_name: 'Dr. Rachel Patel',
      email: 'rachel@amerisourcehl.com',
      phone: '+1 (800) 555-4300',
      balance_payable: 8900.0,
    },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: 'po-t1-01',
      tenant_id: t1Id,
      branch_id: b1_t1,
      branch_name: 'Flagship Downtown Store',
      supplier_id: 'sup-t1-02',
      supplier_name: 'Anker Global Supply Network',
      po_number: 'PO-APX-2026-004',
      status: 'ORDERED',
      items: [
        {
          product_id: 'prod-apex-03',
          product_name: 'Anker Prime 65W GaN Fast Charger',
          sku: 'APX-ANKER-65W-GAN',
          quantity_ordered: 50,
          quantity_received: 0,
          unit_cost: 28.5,
        },
        {
          product_id: 'prod-apex-05',
          product_name: 'Braided USB-C to USB-C 100W Cable (2m)',
          sku: 'APX-CABLE-USBC-2M',
          quantity_ordered: 100,
          quantity_received: 0,
          unit_cost: 4.2,
        },
      ],
      total_cost: 1845.0,
      notes: 'Standard holiday inventory replenishment',
      created_at: '2026-11-19T09:00:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-01',
      tenant_id: t1Id,
      user_id: '018dc600-7010-7000-8000-000000000001',
      user_name: 'Alexander Wright',
      action: 'STOCK_ADJUSTMENT',
      details: 'Audit stock count reconciled for Anker Chargers (+5 units found in rear shelf)',
      old_value: '40',
      new_value: '45',
      ip_address: '192.168.1.10',
      created_at: '2026-11-15T15:20:00Z',
    },
  ];

  const idempotencyKeys = new Map<string, string>();
  idempotencyKeys.set('018dc600-7099-7000-8000-000000000001', 'sale-apex-001');

  return {
    tenants,
    branches,
    users,
    categories,
    products,
    ledger,
    sales,
    suppliers,
    purchaseOrders,
    auditLogs,
    idempotencyKeys,
  };
}

// Global singleton in Node environment
const globalStore = (global as unknown as { __RETAIL_STORE__?: StoreData });
if (!globalStore.__RETAIL_STORE__) {
  globalStore.__RETAIL_STORE__ = initializeSeedData();
}
const store = globalStore.__RETAIL_STORE__;

/**
 * Multi-Tenant Data Store Service
 * Enforces Zero-Trust isolation: every read/write requires tenant_id
 */
export const db = {
  // TENANTS
  getTenants(): Tenant[] {
    return store.tenants;
  },

  getTenant(id: string): Tenant | undefined {
    return store.tenants.find(t => t.id === id);
  },

  // USERS & CREDENTIALS
  findUserByEmail(email: string): User | undefined {
    const normalized = normalizeEmail(email);
    return store.users.find(u => u.email.toLowerCase() === normalized);
  },

  getUserById(id: string): User | undefined {
    return store.users.find(u => u.id === id);
  },

  /**
   * Verifies credentials. Always performs a scrypt comparison, even for unknown
   * accounts, so response timing does not reveal which emails exist.
   */
  authenticate(email: string, password: string): User | null {
    const user = this.findUserByEmail(email);
    if (!user || !user.is_active) {
      verifyPassword(password, DUMMY_PASSWORD_HASH);
      return null;
    }
    if (!verifyPassword(password, user.password_hash)) return null;
    return user;
  },

  updateTenantSettings(tenantId: string, settings: Partial<Tenant['settings']>): Tenant {
    const tenant = store.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    tenant.settings = { ...tenant.settings, ...settings };
    return tenant;
  },

  // BRANCHES
  getBranches(tenantId: string): Branch[] {
    return store.branches.filter(b => b.tenant_id === tenantId);
  },

  getBranch(tenantId: string, branchId: string): Branch | undefined {
    return store.branches.find(b => b.tenant_id === tenantId && b.id === branchId);
  },

  // CATEGORIES
  getCategories(tenantId: string): Category[] {
    return store.categories.filter(c => c.tenant_id === tenantId);
  },

  // PRODUCTS
  getProducts(tenantId: string, branchId?: string, search?: string, categoryId?: string): Product[] {
    return store.products
      .filter(p => p.tenant_id === tenantId)
      .filter(p => (!categoryId || categoryId === 'ALL' ? true : p.category_id === categoryId))
      .filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          (p.variants && p.variants.some(v => v.sku.toLowerCase().includes(q) || v.barcode.includes(q) || v.name.toLowerCase().includes(q)))
        );
      });
  },

  getProduct(tenantId: string, productId: string): Product | undefined {
    return store.products.find(p => p.tenant_id === tenantId && p.id === productId);
  },

  findProductByBarcode(tenantId: string, barcode: string): { product: Product; variant?: ProductVariant } | null {
    for (const p of store.products) {
      if (p.tenant_id !== tenantId) continue;
      if (p.barcode === barcode) {
        return { product: p };
      }
      if (p.variants) {
        const v = p.variants.find(item => item.barcode === barcode);
        if (v) return { product: p, variant: v };
      }
    }
    return null;
  },

  createProduct(tenantId: string, data: Omit<Product, 'id' | 'tenant_id' | 'stock_by_branch'> & { initial_stock?: Record<string, number> }, user: string): Product {
    // Check unique sku & barcode in tenant
    const existing = store.products.find(
      p => p.tenant_id === tenantId && (p.sku === data.sku || p.barcode === data.barcode)
    );
    if (existing) {
      throw new Error(`Product with SKU "${data.sku}" or Barcode "${data.barcode}" already exists for this tenant.`);
    }

    const productId = generateUUIDv7();
    const stock_by_branch: Record<string, number> = {};
    const branches = this.getBranches(tenantId);
    branches.forEach(b => {
      stock_by_branch[b.id] = (data.initial_stock && data.initial_stock[b.id]) || 0;
    });

    const category = store.categories.find(c => c.tenant_id === tenantId && c.id === data.category_id);

    const newProduct: Product = {
      ...data,
      id: productId,
      tenant_id: tenantId,
      category_name: category?.name,
      stock_by_branch,
    };

    store.products.push(newProduct);

    // If initial stock was provided, write immutable ledger entries
    for (const [bId, qty] of Object.entries(stock_by_branch)) {
      if (qty > 0) {
        const b = branches.find(item => item.id === bId);
        store.ledger.push({
          id: generateUUIDv7(),
          tenant_id: tenantId,
          branch_id: bId,
          branch_name: b?.name,
          product_id: productId,
          product_name: newProduct.name,
          sku: newProduct.sku,
          movement_type: 'PURCHASE_IN',
          quantity_delta: qty,
          balance_after: qty,
          cost_price_at_time: newProduct.cost_price,
          reference_id: 'INIT-STOCK',
          notes: 'Initial catalog creation stock',
          created_by_user: user,
          created_at: new Date().toISOString(),
        });
      }
    }

    return newProduct;
  },

  // STOCK LEDGER & MOVEMENTS
  getLedger(tenantId: string, branchId?: string, productId?: string): StockLedgerEntry[] {
    return store.ledger
      .filter(l => l.tenant_id === tenantId)
      .filter(l => (!branchId || branchId === 'ALL' ? true : l.branch_id === branchId))
      .filter(l => (!productId ? true : l.product_id === productId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  adjustStock(
    tenantId: string,
    params: {
      branch_id: string;
      product_id: string;
      variant_id?: string;
      new_quantity: number;
      reason: string;
      user: { id: string; name: string };
      ip_address?: string;
    }
  ): { product: Product; ledgerEntry: StockLedgerEntry } {
    const product = store.products.find(p => p.tenant_id === tenantId && p.id === params.product_id);
    if (!product) throw new Error('Product not found in tenant');

    const branch = store.branches.find(b => b.tenant_id === tenantId && b.id === params.branch_id);
    if (!branch) throw new Error('Branch not found in tenant');

    const currentQty = product.stock_by_branch[params.branch_id] || 0;
    const delta = params.new_quantity - currentQty;

    if (delta === 0) {
      throw new Error('New quantity matches current quantity; no adjustment needed.');
    }

    product.stock_by_branch[params.branch_id] = params.new_quantity;

    const ledgerEntry: StockLedgerEntry = {
      id: generateUUIDv7(),
      tenant_id: tenantId,
      branch_id: params.branch_id,
      branch_name: branch.name,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      variant_id: params.variant_id,
      movement_type: 'ADJUSTMENT',
      quantity_delta: delta,
      balance_after: params.new_quantity,
      cost_price_at_time: product.cost_price,
      reference_id: `ADJ-${Date.now().toString(36).toUpperCase()}`,
      notes: params.reason,
      created_by_user: params.user.name,
      created_at: new Date().toISOString(),
    };

    store.ledger.push(ledgerEntry);

    // Mandatory Audit Log
    store.auditLogs.push({
      id: generateUUIDv7(),
      tenant_id: tenantId,
      user_id: params.user.id,
      user_name: params.user.name,
      action: 'STOCK_ADJUSTMENT',
      details: `Stock adjustment for ${product.name} (${product.sku}) at branch ${branch.name}. Reason: ${params.reason}`,
      old_value: `${currentQty}`,
      new_value: `${params.new_quantity}`,
      ip_address: params.ip_address || '127.0.0.1',
      created_at: new Date().toISOString(),
    });

    return { product, ledgerEntry };
  },

  transferStock(
    tenantId: string,
    params: {
      from_branch_id: string;
      to_branch_id: string;
      product_id: string;
      quantity: number;
      notes?: string;
      user: { id: string; name: string };
      ip_address?: string;
    }
  ): { product: Product; transferOut: StockLedgerEntry; transferIn: StockLedgerEntry } {
    if (params.from_branch_id === params.to_branch_id) {
      throw new Error('Source and destination branches must be different.');
    }
    if (params.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    const product = store.products.find(p => p.tenant_id === tenantId && p.id === params.product_id);
    if (!product) throw new Error('Product not found in tenant');

    const fromBranch = store.branches.find(b => b.tenant_id === tenantId && b.id === params.from_branch_id);
    const toBranch = store.branches.find(b => b.tenant_id === tenantId && b.id === params.to_branch_id);
    if (!fromBranch || !toBranch) throw new Error('Branches not found in tenant');

    const tenant = store.tenants.find(t => t.id === tenantId);
    const sourceQty = product.stock_by_branch[params.from_branch_id] || 0;

    if (!tenant?.settings.allow_negative_stock && sourceQty < params.quantity) {
      throw new Error(`Insufficient stock in ${fromBranch.name}. Available: ${sourceQty}, Requested: ${params.quantity}`);
    }

    // ACID Transaction modification:
    product.stock_by_branch[params.from_branch_id] = sourceQty - params.quantity;
    const destQty = product.stock_by_branch[params.to_branch_id] || 0;
    product.stock_by_branch[params.to_branch_id] = destQty + params.quantity;

    const transferRef = `TR-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const transferOut: StockLedgerEntry = {
      id: generateUUIDv7(),
      tenant_id: tenantId,
      branch_id: params.from_branch_id,
      branch_name: fromBranch.name,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      movement_type: 'TRANSFER_OUT',
      quantity_delta: -params.quantity,
      balance_after: product.stock_by_branch[params.from_branch_id],
      cost_price_at_time: product.cost_price,
      reference_id: transferRef,
      notes: `Transfer to ${toBranch.name}. ${params.notes || ''}`.trim(),
      created_by_user: params.user.name,
      created_at: timestamp,
    };

    const transferIn: StockLedgerEntry = {
      id: generateUUIDv7(),
      tenant_id: tenantId,
      branch_id: params.to_branch_id,
      branch_name: toBranch.name,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      movement_type: 'TRANSFER_IN',
      quantity_delta: params.quantity,
      balance_after: product.stock_by_branch[params.to_branch_id],
      cost_price_at_time: product.cost_price,
      reference_id: transferRef,
      notes: `Transfer from ${fromBranch.name}. ${params.notes || ''}`.trim(),
      created_by_user: params.user.name,
      created_at: timestamp,
    };

    store.ledger.push(transferOut);
    store.ledger.push(transferIn);

    store.auditLogs.push({
      id: generateUUIDv7(),
      tenant_id: tenantId,
      user_id: params.user.id,
      user_name: params.user.name,
      action: 'BRANCH_TRANSFER',
      details: `Transferred ${params.quantity}x ${product.name} from ${fromBranch.name} to ${toBranch.name}. Ref: ${transferRef}`,
      old_value: `${fromBranch.name}: ${sourceQty}`,
      new_value: `${fromBranch.name}: ${product.stock_by_branch[params.from_branch_id]}, ${toBranch.name}: ${product.stock_by_branch[params.to_branch_id]}`,
      ip_address: params.ip_address || '127.0.0.1',
      created_at: timestamp,
    });

    return { product, transferOut, transferIn };
  },

  // POS CHECKOUT (ACID & IDEMPOTENT)
  checkoutPOS(
    tenantId: string,
    payload: {
      branch_id: string;
      idempotency_key: string;
      cashier: { id: string; name: string };
      customer?: { name?: string; phone?: string };
      items: {
        product_id: string;
        variant_id?: string;
        quantity: number;
        unit_price?: number; // manual price override check
        batch_number?: string;
      }[];
      discount_percent?: number;
      discount_amount?: number;
      payments: PaymentEntry[];
      ip_address?: string;
    }
  ): Sale {
    // 1. Idempotency Check
    if (store.idempotencyKeys.has(payload.idempotency_key)) {
      const existingSaleId = store.idempotencyKeys.get(payload.idempotency_key)!;
      const existingSale = store.sales.find(s => s.tenant_id === tenantId && s.id === existingSaleId);
      if (existingSale) {
        return existingSale;
      }
    }

    const tenant = store.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const branch = store.branches.find(b => b.tenant_id === tenantId && b.id === payload.branch_id);
    if (!branch) throw new Error('Branch not found');

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cannot checkout an empty cart.');
    }

    // 2. Validate Inventory & Stock constraints
    const validatedItems: SaleItem[] = [];
    let subtotal = 0;
    const auditEvents: { action: AuditLog['action']; details: string; old_value?: string; new_value?: string }[] = [];

    for (const cartItem of payload.items) {
      const product = store.products.find(p => p.tenant_id === tenantId && p.id === cartItem.product_id);
      if (!product) throw new Error(`Product not found with id ${cartItem.product_id}`);

      const currentStock = product.stock_by_branch[payload.branch_id] || 0;
      if (!tenant.settings.allow_negative_stock && currentStock < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${currentStock}, Requested: ${cartItem.quantity}`
        );
      }

      let unitPrice = product.retail_price;
      let costPrice = product.cost_price;
      let sku = product.sku;
      let barcode = product.barcode;

      if (cartItem.variant_id && product.variants) {
        const variant = product.variants.find(v => v.id === cartItem.variant_id);
        if (variant) {
          unitPrice = variant.retail_price;
          costPrice = variant.cost_price;
          sku = variant.sku;
          barcode = variant.barcode;
        }
      }

      // Check manual price override
      if (cartItem.unit_price !== undefined && cartItem.unit_price !== unitPrice) {
        auditEvents.push({
          action: 'MANUAL_PRICE_OVERRIDE',
          details: `Cashier overridden price for "${product.name}" from ${unitPrice} to ${cartItem.unit_price}`,
          old_value: `${unitPrice}`,
          new_value: `${cartItem.unit_price}`,
        });
        unitPrice = cartItem.unit_price;
      }

      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;

      validatedItems.push({
        id: generateUUIDv7(),
        product_id: product.id,
        variant_id: cartItem.variant_id,
        product_name: product.name,
        sku,
        barcode,
        unit_price: unitPrice,
        cost_price: costPrice,
        quantity: cartItem.quantity,
        total_price: lineTotal,
        batch_number: cartItem.batch_number,
      });
    }

    // Calculate Discounts & Taxes
    let discountAmount = payload.discount_amount || 0;
    const discountPercent = payload.discount_percent || 0;
    if (discountPercent > 0) {
      discountAmount = (subtotal * discountPercent) / 100;
    }

    // Audit Log for discounts > 10%
    if (discountPercent > 10 || (subtotal > 0 && (discountAmount / subtotal) > 0.10)) {
      auditEvents.push({
        action: 'HIGH_DISCOUNT_APPLIED',
        details: `High discount applied: ${discountPercent}% ($${discountAmount.toFixed(2)}) on subtotal $${subtotal.toFixed(2)}`,
        old_value: '0%',
        new_value: `${discountPercent}% ($${discountAmount.toFixed(2)})`,
      });
    }

    const netTaxable = Math.max(0, subtotal - discountAmount);
    let taxAmount = 0;
    const taxRate = tenant.settings.tax_config.enabled ? tenant.settings.tax_config.default_rate : 0;

    if (tenant.settings.tax_config.enabled && taxRate > 0) {
      if (tenant.settings.tax_config.inclusive) {
        // Tax included in price
        taxAmount = netTaxable - (netTaxable / (1 + taxRate / 100));
      } else {
        // Tax added on top
        taxAmount = (netTaxable * taxRate) / 100;
      }
    }

    const totalAmount = tenant.settings.tax_config.inclusive ? netTaxable : netTaxable + taxAmount;

    // Calculate Payments & Change
    const totalPaid = payload.payments.reduce((acc, p) => acc + p.amount, 0);
    const changeGiven = Math.max(0, totalPaid - totalAmount);

    const saleId = generateUUIDv7();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();

    const sale: Sale = {
      id: saleId,
      tenant_id: tenantId,
      branch_id: payload.branch_id,
      invoice_number: invoiceNumber,
      idempotency_key: payload.idempotency_key,
      cashier_id: payload.cashier.id,
      cashier_name: payload.cashier.name,
      customer_name: payload.customer?.name,
      customer_phone: payload.customer?.phone,
      items: validatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_amount: Math.round(discountAmount * 100) / 100,
      discount_percent: discountPercent,
      tax_rate: taxRate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      payments: payload.payments,
      change_given: Math.round(changeGiven * 100) / 100,
      status: 'COMPLETED',
      created_at: nowIso,
    };

    // 3. Atomically Deduct Inventory & Append Immutable Ledger Entries
    for (const item of validatedItems) {
      const product = store.products.find(p => p.id === item.product_id)!;
      const prevStock = product.stock_by_branch[payload.branch_id] || 0;
      const newStock = prevStock - item.quantity;
      product.stock_by_branch[payload.branch_id] = newStock;

      // Deduct from batch if tracking is enabled and batch was selected or FEFO
      if (product.track_batch_expiry && product.batches) {
        const batch = item.batch_number
          ? product.batches.find(b => b.branch_id === payload.branch_id && b.batch_number === item.batch_number)
          : product.batches.filter(b => b.branch_id === payload.branch_id).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];
        if (batch) {
          batch.quantity = Math.max(0, batch.quantity - item.quantity);
        }
      }

      store.ledger.push({
        id: generateUUIDv7(),
        tenant_id: tenantId,
        branch_id: payload.branch_id,
        branch_name: branch.name,
        product_id: product.id,
        product_name: product.name,
        sku: item.sku,
        variant_id: item.variant_id,
        movement_type: 'SALE_OUT',
        quantity_delta: -item.quantity,
        balance_after: newStock,
        cost_price_at_time: item.cost_price,
        reference_id: invoiceNumber,
        notes: `POS Checkout (${invoiceNumber})`,
        created_by_user: payload.cashier.name,
        created_at: nowIso,
      });
    }

    // 4. Save Sale & Register Idempotency Key
    store.sales.push(sale);
    store.idempotencyKeys.set(payload.idempotency_key, saleId);

    // 5. Append Audit Logs
    for (const audit of auditEvents) {
      store.auditLogs.push({
        id: generateUUIDv7(),
        tenant_id: tenantId,
        user_id: payload.cashier.id,
        user_name: payload.cashier.name,
        action: audit.action,
        details: audit.details,
        old_value: audit.old_value,
        new_value: audit.new_value,
        ip_address: payload.ip_address || '127.0.0.1',
        created_at: nowIso,
      });
    }

    return sale;
  },

  getSales(tenantId: string, branchId?: string): Sale[] {
    return store.sales
      .filter(s => s.tenant_id === tenantId)
      .filter(s => (!branchId || branchId === 'ALL' ? true : s.branch_id === branchId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // SUPPLIERS & PURCHASE ORDERS
  getSuppliers(tenantId: string): Supplier[] {
    return store.suppliers.filter(s => s.tenant_id === tenantId);
  },

  createSupplier(tenantId: string, data: Omit<Supplier, 'id' | 'tenant_id' | 'balance_payable'>): Supplier {
    const supplier: Supplier = {
      ...data,
      id: generateUUIDv7(),
      tenant_id: tenantId,
      balance_payable: 0,
    };
    store.suppliers.push(supplier);
    return supplier;
  },

  getPurchaseOrders(tenantId: string, branchId?: string): PurchaseOrder[] {
    return store.purchaseOrders
      .filter(po => po.tenant_id === tenantId)
      .filter(po => (!branchId || branchId === 'ALL' ? true : po.branch_id === branchId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createPurchaseOrder(
    tenantId: string,
    payload: {
      branch_id: string;
      supplier_id: string;
      items: {
        product_id: string;
        quantity_ordered: number;
        unit_cost: number;
      }[];
      notes?: string;
    }
  ): PurchaseOrder {
    const branch = store.branches.find(b => b.tenant_id === tenantId && b.id === payload.branch_id);
    const supplier = store.suppliers.find(s => s.tenant_id === tenantId && s.id === payload.supplier_id);
    if (!branch || !supplier) throw new Error('Branch or Supplier not found');

    let totalCost = 0;
    const poItems: PurchaseOrder['items'] = [];

    for (const item of payload.items) {
      const prod = store.products.find(p => p.tenant_id === tenantId && p.id === item.product_id);
      if (!prod) continue;
      const lineCost = item.quantity_ordered * item.unit_cost;
      totalCost += lineCost;
      poItems.push({
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        quantity_ordered: item.quantity_ordered,
        quantity_received: 0,
        unit_cost: item.unit_cost,
      });
    }

    const po: PurchaseOrder = {
      id: generateUUIDv7(),
      tenant_id: tenantId,
      branch_id: payload.branch_id,
      branch_name: branch.name,
      supplier_id: payload.supplier_id,
      supplier_name: supplier.name,
      po_number: `PO-${Date.now().toString().slice(-6)}`,
      status: 'ORDERED',
      items: poItems,
      total_cost: Math.round(totalCost * 100) / 100,
      notes: payload.notes,
      created_at: new Date().toISOString(),
    };

    store.purchaseOrders.push(po);
    supplier.balance_payable += totalCost;

    return po;
  },

  receivePurchaseOrderGRN(
    tenantId: string,
    payload: {
      po_id: string;
      received_items: {
        product_id: string;
        quantity_received: number;
        batch_number?: string;
        expiry_date?: string;
      }[];
      user: { id: string; name: string };
      ip_address?: string;
    }
  ): PurchaseOrder {
    const po = store.purchaseOrders.find(p => p.tenant_id === tenantId && p.id === payload.po_id);
    if (!po) throw new Error('Purchase Order not found');

    const branch = store.branches.find(b => b.tenant_id === tenantId && b.id === po.branch_id);
    const nowIso = new Date().toISOString();
    let allCompleted = true;

    for (const rec of payload.received_items) {
      const poItem = po.items.find(i => i.product_id === rec.product_id);
      if (!poItem || rec.quantity_received <= 0) continue;

      poItem.quantity_received += rec.quantity_received;
      if (poItem.quantity_received < poItem.quantity_ordered) {
        allCompleted = false;
      }

      // Update product inventory & cost price
      const product = store.products.find(p => p.tenant_id === tenantId && p.id === rec.product_id);
      if (product) {
        const prevStock = product.stock_by_branch[po.branch_id] || 0;
        const newStock = prevStock + rec.quantity_received;
        product.stock_by_branch[po.branch_id] = newStock;
        product.cost_price = poItem.unit_cost; // update valuation

        // If batch provided, add batch entry
        if (product.track_batch_expiry && rec.batch_number && rec.expiry_date) {
          if (!product.batches) product.batches = [];
          product.batches.push({
            id: generateUUIDv7(),
            product_id: product.id,
            branch_id: po.branch_id,
            batch_number: rec.batch_number,
            manufacturing_date: new Date().toISOString().split('T')[0],
            expiry_date: rec.expiry_date,
            quantity: rec.quantity_received,
            cost_price: poItem.unit_cost,
          });
        }

        // Ledger Entry
        store.ledger.push({
          id: generateUUIDv7(),
          tenant_id: tenantId,
          branch_id: po.branch_id,
          branch_name: branch?.name,
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          movement_type: 'PURCHASE_IN',
          quantity_delta: rec.quantity_received,
          balance_after: newStock,
          cost_price_at_time: poItem.unit_cost,
          reference_id: po.po_number,
          notes: `GRN Received from PO ${po.po_number}`,
          created_by_user: payload.user.name,
          created_at: nowIso,
        });
      }
    }

    po.status = allCompleted ? 'COMPLETED' : 'PARTIAL_RECEIVED';

    store.auditLogs.push({
      id: generateUUIDv7(),
      tenant_id: tenantId,
      user_id: payload.user.id,
      user_name: payload.user.name,
      action: 'STOCK_RECEIVED_GRN',
      details: `Goods Received Note (GRN) processed for PO ${po.po_number}. Status is now ${po.status}`,
      old_value: 'ORDERED',
      new_value: po.status,
      ip_address: payload.ip_address || '127.0.0.1',
      created_at: nowIso,
    });

    return po;
  },

  // AUDIT LOGS
  getAuditLogs(tenantId: string): AuditLog[] {
    return store.auditLogs
      .filter(a => a.tenant_id === tenantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // REPORTS & SUMMARY
  getSummaryReport(tenantId: string, branchId?: string) {
    const sales = this.getSales(tenantId, branchId);
    const products = this.getProducts(tenantId, branchId);
    const tenant = this.getTenant(tenantId);
    const threshold = tenant?.settings.low_stock_threshold_default || 5;

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const s of sales) {
      totalRevenue += s.total_amount;
      totalDiscount += s.discount_amount;
      totalTax += s.tax_amount;

      for (const item of s.items) {
        totalCOGS += item.cost_price * item.quantity;
        const curr = productSalesMap.get(item.product_id) || { name: item.product_name, quantity: 0, revenue: 0 };
        curr.quantity += item.quantity;
        curr.revenue += item.total_price;
        productSalesMap.set(item.product_id, curr);
      }
    }

    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;

    // Low stock products
    const lowStockItems: { product: Product; currentStock: number }[] = [];
    for (const p of products) {
      const stock = branchId && branchId !== 'ALL'
        ? (p.stock_by_branch[branchId] || 0)
        : Object.values(p.stock_by_branch).reduce((a, b) => a + b, 0);

      if (stock <= (p.reorder_level || threshold)) {
        lowStockItems.push({ product: p, currentStock: stock });
      }
    }

    // Top selling products
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Expiring batches (within 30 days)
    const expiringSoon: { product_name: string; batch_number: string; expiry_date: string; quantity: number }[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const p of products) {
      if (p.batches) {
        for (const b of p.batches) {
          const exp = new Date(b.expiry_date);
          if (exp <= thirtyDaysFromNow && b.quantity > 0) {
            expiringSoon.push({
              product_name: p.name,
              batch_number: b.batch_number,
              expiry_date: b.expiry_date,
              quantity: b.quantity,
            });
          }
        }
      }
    }

    return {
      totalSalesCount: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round((totalRevenue - totalCOGS) * 100) / 100,
      grossMargin: Math.round(grossMargin * 10) / 10,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      topProducts,
      expiringSoon,
    };
  },
};
