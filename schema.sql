-- ==============================================================================
-- OmniRetail SaaS - Multi-Tenant Database Schema with Row-Level Security (RLS)
-- Target: PostgreSQL 16+
-- ==============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tenants Table (Global Scope)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'STARTER', -- STARTER, GROWTH, ENTERPRISE
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    settings JSONB NOT NULL DEFAULT '{
        "currency_code": "USD",
        "currency_symbol": "$",
        "timezone": "UTC",
        "tax_config": {
            "enabled": true,
            "inclusive": false,
            "default_rate": 7.5,
            "tax_id_label": "VAT/GST"
        },
        "low_stock_threshold_default": 5,
        "receipt_footer_text": "Thank you for shopping with us!",
        "allow_negative_stock": false,
        "batch_tracking_enabled": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 3. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    is_main BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_branches_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);

-- 4. Users & Staff Table
-- `tenant_id` is the user's primary (default) tenant. Multi-tenant access is
-- granted through `user_memberships` below — never through a role column claim.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, TENANT_OWNER, BRANCH_MANAGER, CASHIER, INVENTORY_CLERK
    -- scrypt hash in the form scrypt$N$r$p$salt$derivedKey. Never store plaintext.
    password_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    pin VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    -- One account per email address; tenant scope comes from user_memberships.
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- 4b. Tenant Memberships (authorization source of truth)
-- A user can belong to several tenants with a different role in each. A
-- membership carrying `branch_id` is limited to that single branch.
CREATE TABLE IF NOT EXISTS user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_membership_user_tenant UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_tenant_id ON user_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categories_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);

-- 6. Products Table (Catalog)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'pcs',
    cost_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    retail_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    reorder_level INT NOT NULL DEFAULT 5,
    image_url TEXT,
    has_variants BOOLEAN NOT NULL DEFAULT false,
    track_batch_expiry BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_products_tenant_sku UNIQUE (tenant_id, sku),
    CONSTRAINT uq_products_tenant_barcode UNIQUE (tenant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode ON products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- 7. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    cost_price NUMERIC(14, 4) NOT NULL,
    retail_price NUMERIC(14, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_variants_tenant_sku UNIQUE (tenant_id, sku),
    CONSTRAINT uq_variants_tenant_barcode UNIQUE (tenant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_variants_tenant_prod ON product_variants(tenant_id, product_id);

-- 8. Batches & Expiry (Pharmacies & Groceries)
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    cost_price NUMERIC(14, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_tenant_branch_fefo ON product_batches(tenant_id, branch_id, product_id, expiry_date ASC);

-- 9. Inventory Stocks (Current Snapshot)
CREATE TABLE IF NOT EXISTS inventory_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity_on_hand NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inventory_tenant_branch_prod_var UNIQUE NULLS NOT DISTINCT (tenant_id, branch_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_stocks_tenant_branch ON inventory_stocks(tenant_id, branch_id);

-- 10. Immutable Stock Ledger (Audit Trail of Stock Movements)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL, -- PURCHASE_IN, SALE_OUT, RETURN_IN, DAMAGE_OUT, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT
    quantity_delta NUMERIC(14, 4) NOT NULL,
    balance_after NUMERIC(14, 4) NOT NULL,
    cost_price_at_time NUMERIC(14, 4) NOT NULL,
    reference_id VARCHAR(100) NOT NULL, -- invoice_number, po_number, transfer_id, etc.
    notes TEXT,
    created_by_user VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_branch_prod ON stock_ledger(tenant_id, branch_id, product_id, created_at DESC);

-- 11. Sales (Invoices)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    idempotency_key UUID NOT NULL,
    cashier_id UUID NOT NULL,
    cashier_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal NUMERIC(14, 4) NOT NULL,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(14, 4) NOT NULL,
    change_given NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, REFUNDED, VOIDED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sales_tenant_idempotency UNIQUE (tenant_id, idempotency_key),
    CONSTRAINT uq_sales_tenant_invoice UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_branch_date ON sales(tenant_id, branch_id, created_at DESC);

-- 12. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    unit_price NUMERIC(14, 4) NOT NULL,
    cost_price NUMERIC(14, 4) NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL,
    total_price NUMERIC(14, 4) NOT NULL,
    batch_number VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_sale ON sale_items(tenant_id, sale_id);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper tenant isolation policies using current_setting('app.current_tenant_id')
CREATE POLICY tenant_isolation_branches ON branches
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_user_memberships ON user_memberships
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_categories ON categories
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_products ON products
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_variants ON product_variants
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_batches ON product_batches
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_stocks ON inventory_stocks
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_ledger ON stock_ledger
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_sales ON sales
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_sale_items ON sale_items
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
