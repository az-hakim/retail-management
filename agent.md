# AGENT.md — Multi-Tenant Local Retail Inventory Management SaaS

## 1. System Overview & Mission
You are an AI software architect and full-stack engineer building a **Multi-Tenant Cloud SaaS for Local Retail Inventory & POS Management**. The platform enables independent retail shops (grocery, electronics, pharmacy, apparel, hardware) to manage stock, suppliers, multi-branch operations, point-of-sale (POS) billing, and analytics from a single shared infrastructure while maintaining strict data isolation.

---

## 2. Core Multi-Tenancy Architecture

### 2.1 Tenant Isolation Model
* **Strategy:** Shared Database, Shared Schema with **Row-Level Security (RLS)** enforced at the database layer.
* **Tenant Identifier:** Every tenant-scoped table MUST include a non-nullable `tenant_id` (`UUID`, indexed) referencing `tenants(id)`.
* **Subdomain / Path Routing:**
  * Support custom subdomains (`{shop-slug}.retailapp.com`) and fallback path routing (`app.retailapp.com/{shop-slug}`).
  * Middleware MUST resolve `tenant_id` from the authenticated session before executing any controller logic. Tenant membership (not a header or body value) determines which tenants a user may act in; see `docs/authentication.md`.

### 2.2 Security & Data Leakage Prevention
* **Zero-Trust Queries:** Never trust `tenant_id` passed in the request body or query parameters from the client. Always extract `tenant_id` from the verified session/JWT token.
* **Database RLS Policy (PostgreSQL):**
  ```sql
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_policy ON products
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
  ```
* **Cross-Tenant Joins:** Strictly prohibited unless explicitly executed by a `SUPER_ADMIN` system worker for aggregated platform telemetry.

---

## 3. Recommended Tech Stack & Configuration

* **Backend Runtime:** Node.js (TypeScript) with NestJS or Fastify / Go (Fiber) / Python (FastAPI).
* **Primary Database:** PostgreSQL 16+ (with `pg_trgm` for fast barcode/SKU fuzzy search and native RLS).
* **Caching & Session Store:** Redis (namespaced keys: `tenant:{tenant_id}:session:{id}`, `tenant:{tenant_id}:stock:{sku}`).
* **Frontend:** Next.js (App Router) or React + Vite with IndexedDB/Service Workers for **Offline-First POS** resilience.
* **Storage:** S3-compatible object storage (bucket structure: `/{tenant_id}/products/{product_id}.webp`).
* **Queue / Background Jobs:** BullMQ / Temporal for low-stock alerts, daily closing reports, and bulk CSV imports.

---

## 4. Role-Based Access Control (RBAC)

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Platform-wide | Manage subscriptions, suspend tenants, view global health metrics. |
| `TENANT_OWNER` | Tenant-wide | Full access to billing, branches, staff creation, tax rules, and reports. |
| `BRANCH_MANAGER` | Branch-scoped | Manage local stock, approve purchase orders, process refunds, view branch P&L. |
| `CASHIER` | POS-scoped | Create sales invoices, scan barcodes, apply pre-approved discounts, close shift. |
| `INVENTORY_CLERK` | Warehouse/Stock | Receive stock (GRN), perform stock counts/audits, print barcode labels. |

---

## 5. Core Domain Modules & Requirements

### 5.1 Tenant & Branch Configuration (`tenants`, `branches`)
* **Tenant Settings JSONB Schema:**
  * `currency_code` (e.g., `USD`, `BDT`, `EUR`, `INR`)
  * `timezone` (e.g., `Asia/Dhaka`, `America/New_York`)
  * `tax_config`: `{ "enabled": true, "inclusive": false, "default_rate": 7.5, "tax_id_label": "VAT/GST" }`
  * `low_stock_threshold_default`: Integer (default `5`)
  * `receipt_footer_text`: String
  * `allow_negative_stock`: Boolean (default `false`)
* **Multi-Branch Support:** A single tenant can operate multiple retail outlets (`branches`). Inventory quantities are tracked per `(tenant_id, branch_id, variant_id)`.

### 5.2 Product & Catalog Management (`products`, `product_variants`, `categories`)
* Support simple products and matrix/variant products (Size, Color, Pack Size).
* **Mandatory Fields:** `sku` (unique per tenant), `barcode` (EAN-13 / UPC / Code-128, unique per tenant), `name`, `category_id`, `unit_of_measure` (pcs, kg, liter, box).
* **Batch & Expiry Tracking (Optional per product):** Crucial for pharmacies and groceries (`batch_number`, `manufacturing_date`, `expiry_date`, FEFO — First-Expired, First-Out deduction).

### 5.3 Inventory Ledger & Stock Movements (`inventory_stocks`, `stock_ledger`)
* **Immutable Ledger Rule:** NEVER overwrite `quantity_on_hand` directly without recording a ledger entry.
* Every stock change must insert an immutable row into `stock_ledger`:
  * `movement_type`: `PURCHASE_IN`, `SALE_OUT`, `RETURN_IN`, `DAMAGE_OUT`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`.
  * `quantity_delta`: Signed decimal (`+50.00`, `-2.00`).
  * `reference_id`: Link to `sale_id`, `purchase_order_id`, or `transfer_id`.
  * `cost_price_at_time`: Snapshot for accurate COGS (Cost of Goods Sold) valuation (FIFO or Weighted Average).

### 5.4 Point of Sale (POS) & Offline Sync (`sales`, `sale_items`, `payments`)
* **Barcode-First UX:** Sub-100ms barcode lookup using cached catalog index.
* **Offline Capability:** If internet drops, POS queues transactions locally in IndexedDB with client-generated UUIDv7 (`idempotency_key`) and syncs automatically upon reconnection.
* **Split Payments:** Support Cash, Card, Mobile Wallet, and Store Credit on a single invoice.
* **Thermal Receipt Generation:** ESC/POS command support (58mm and 80mm thermal printers).

### 5.5 Suppliers & Purchase Orders (`suppliers`, `purchase_orders`, `grn`)
* Track supplier balances (Accounts Payable), purchase order lifecycle (`DRAFT` -> `ORDERED` -> `PARTIAL_RECEIVED` -> `COMPLETED`), and Goods Received Notes (GRN) that automatically update inventory cost prices.

### 5.6 Automated Alerts & Notifications
* Trigger async webhook/SMS/WhatsApp/Email notifications when `quantity_on_hand <= reorder_level` or when products are within 30 days of `expiry_date`.

---

## 6. SaaS Subscription & Feature Gating

Enforce plan limits at the API gateway/middleware level:

| Feature / Quota | Starter Plan | Growth Plan | Enterprise Plan |
| :--- | :--- | :--- | :--- |
| **Branches** | 1 | Up to 5 | Unlimited |
| **Active SKUs** | 1,000 | 15,000 | Unlimited |
| **Staff Accounts** | 3 | 15 | Unlimited |
| **Batch & Expiry Tracking** | Disabled | Enabled | Enabled |
| **API & Webhook Access** | Disabled | Disabled | Enabled |

---

## 7. Database Schema Conventions

1. **Primary Keys:** Use `UUIDv7` (time-ordered UUIDs) for index locality and offline client generation.
2. **Timestamps:** Always store in `UTC` (`TIMESTAMPTZ`) using `created_at`, `updated_at`, and `deleted_at` (soft deletes for auditability).
3. **Monetary Values:** NEVER use `FLOAT` or `DOUBLE`. Use `NUMERIC(14, 4)` or integer minor units (`BIGINT` cents/paisa) to prevent floating-point rounding bugs.
4. **Indexing Strategy:** Composite indexes MUST lead with `tenant_id` (e.g., `CREATE INDEX idx_products_tenant_barcode ON products(tenant_id, barcode);`).

---

## 8. Environment Variables Template (`.env.example`)

```env
# Application
NODE_ENV=production
PORT=8080
APP_BASE_DOMAIN=retailapp.com

# Database (PostgreSQL with RLS)
DATABASE_URL=postgresql://app_user:password@localhost:5432/retail_saas
DATABASE_POOL_MAX=25

# Redis (Caching & BullMQ)
REDIS_URL=redis://localhost:6379

# Authentication & Security (implemented)
# 32+ characters; required in production. Generate with: openssl rand -hex 32
AUTH_SESSION_SECRET=change_me_strong_secret
AUTH_SESSION_TTL_HOURS=12
# Password for seeded demo accounts. Unset in production = unusable demo accounts.
AUTH_SEED_PASSWORD=

# Object Storage (S3 / R2)
S3_BUCKET=retail-saas-assets
S3_REGION=auto
S3_ENDPOINT=https://s3.example.com
S3_ACCESS_KEY=your_key
S3_SECRET_KEY=your_secret

# SaaS Billing (Stripe / Local Payment Gateway)
BILLING_WEBHOOK_SECRET=whsec_xxx
```

---

## 9. AI Coding Agent Guardrails & Instructions

When generating code for this repository, strictly adhere to the following rules:
1. **Tenant Context Middleware:** Every new route/endpoint MUST explicitly declare whether it is `Public`, `TenantScoped`, or `SuperAdminOnly`. Default to `TenantScoped`. Identity (user, role, tenant, branch) MUST come from the verified session via `getTenantContext()` — never from request bodies, query strings or `x-user-*` headers. Only `POST /api/auth/login`, `POST /api/auth/logout` and `GET /api/auth/session` are exempt from the session requirement.
2. **Idempotency:** All POS checkout, stock transfer, and payment endpoints MUST require an `X-Idempotency-Key` header to prevent duplicate inventory deductions on flaky retail internet connections.
3. **Transactional Integrity:** Any operation modifying stock levels and financial ledgers MUST execute inside a single ACID database transaction (`BEGIN ... COMMIT`).
4. **Audit Logging:** Any manual price override, discount above 10%, voided invoice, or manual stock adjustment MUST write an entry to `audit_logs` capturing `user_id`, `ip_address`, `old_value`, and `new_value`.
5. **Testing Requirement:** Every repository/service test suite MUST include a **Cross-Tenant Isolation Test** verifying that Tenant A cannot read, update, or delete records belonging to Tenant B.