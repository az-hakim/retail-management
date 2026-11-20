# OmniRetail — Multi-Tenant Cloud POS & Retail Inventory Management SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

A high-performance, multi-tenant cloud SaaS for local retail businesses (electronics, supermarkets, pharmacies, apparel, hardware). OmniRetail delivers sub-100ms barcode scanning, offline-resilient POS billing with IndexedDB synchronization, immutable double-entry stock ledgers, branch-to-branch inventory transfers, automated Goods Received Notes (GRN), and strict database-layer Row-Level Security (RLS).

---

## 🚀 Key Features

### 1. Multi-Tenant Isolation with Zero-Trust Architecture
* **Tenant Isolation Model:** Shared Database, Shared Schema with **PostgreSQL Row-Level Security (RLS)**.
* **Zero-Trust Queries:** Tenant context is strictly extracted from verified JWT / session headers (`x-tenant-id`). Queries never trust client-provided URL or body tenant parameters.
* **Interactive Multi-Tenant Switcher:** Instant tenant switching in demo mode to preview distinct retail verticals:
  * **Apex Electronics & Gear** (Variants, Serial/SKUs, High-value tech)
  * **FreshMart Supermarket** (Fresh produce, Perishables, Fast barcodes)
  * **Nova Health & Pharma** (Prescription meds, Batch numbers & FEFO expiry tracking)

### 2. Barcode-First Point of Sale (POS) & Offline Resilience
* **Hardware & Keyboard Scanner Support:** Seamless integration with physical USB/Bluetooth handheld barcode scanners (supports EAN-13, UPC, Code-128).
* **Audio Feedback:** Real-time synthesized scan confirmation and error beeps via the Web Audio API (0 external audio dependencies).
* **Offline-First Resilience:** When connectivity drops, transactions are queued locally in browser storage with time-ordered `UUIDv7` idempotency keys and automatically synchronized when reconnected.
* **Split Tender & Payments:** Supports Cash (with real-time change calculator and quick denomination buttons), Credit/Debit cards, Mobile Wallets, and Store Credit.
* **ESC/POS Thermal Receipt Printing:** Native print styling for standard **58mm** and **80mm** thermal roll printers.
* **Cashier Shift Close (Z-Report):** Opening float tracking, tender breakdowns, discount audit, and drawer reconciliation.

### 3. Immutable Stock Ledger & Multi-Branch Inventory
* **Immutable Double-Entry Rule:** Stock quantities on hand are never arbitrarily overwritten. Every change appends an immutable row to `stock_ledger` (`PURCHASE_IN`, `SALE_OUT`, `RETURN_IN`, `DAMAGE_OUT`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`).
* **Branch-to-Branch Transfers:** Atomic transfer of stock between outlets with two-sided ledger validation.
* **Cost Valuation:** Captures historical snapshot cost prices for accurate FIFO / Weighted-Average Cost of Goods Sold (COGS).

### 4. Batch & Expiration Date Tracking (FEFO)
* **First-Expired, First-Out (FEFO):** Critical for grocery perishables and pharmaceuticals. Displays batch numbers, manufacturing dates, and expiration countdowns.
* **Near-Expiry Watchlist:** Automatic alerts for products within 30 days of expiration.

### 5. Procurement, Suppliers & Automated GRN Intake
* **Purchase Order Lifecycle:** `DRAFT` ➔ `ORDERED` ➔ `PARTIAL_RECEIVED` ➔ `COMPLETED`.
* **Goods Received Notes (GRN):** Receiving goods automatically updates warehouse stock and posts `PURCHASE_IN` ledger entries.
* **Accounts Payable Tracking:** Real-time vendor balance management.

### 6. Role-Based Access Control (RBAC) & Security Audit Trail
* **Granular Roles:** `SUPER_ADMIN`, `TENANT_OWNER`, `BRANCH_MANAGER`, `CASHIER`, `INVENTORY_CLERK`.
* **Compliance Audit Trail:** Automatic audit logging for manual price overrides, discounts above 10%, voided sales, and stock adjustments.

---

## 🛠️ Efficient Tech Stack

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Serverless Route Handlers, React 19)
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Database & Schema:** PostgreSQL 16+ with RLS (`schema.sql` & `prisma/schema.prisma`)
* **Persistence & Fallback:** Dual-layer architecture: Zero-config in-memory store for instant Vercel previews + full PostgreSQL/Prisma adapter for production.
* **Testing:** Node.js native test runner with `tsx` (`npm test`)

---

## 🏁 Getting Started

### Prerequisites
* Node.js 20+ (v22 recommended)
* npm 10+

### Installation
```bash
# Clone the repository
git clone https://github.com/az-hakim/retail-management.git
cd retail-management

# Install dependencies
npm install

# Run automated tests (Cross-Tenant Isolation Suite)
npm test

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Cross-Tenant Isolation

The repository contains an automated test suite enforcing tenant data isolation as required by Section 9.5 of `agent.md`:

```bash
npm test
```

Tests include:
* Partitioned catalog queries (Tenant A cannot see Tenant B's products)
* Barcode lookup isolation
* POS stock deduction non-interference
* Illegal cross-tenant branch transfer rejection
* Idempotent checkout preventing duplicate inventory deductions on flaky networks
* Stock ledger isolation

---

## 📦 Database & Row-Level Security (RLS)

Inspect the database definitions:
* **`schema.sql`**: Full PostgreSQL DDL with `ENABLE ROW LEVEL SECURITY;` and `CREATE POLICY tenant_isolation_policy` for all tables.
* **`prisma/schema.prisma`**: Prisma schema with composite indexes leading with `tenant_id`.

---

## 🚢 Deployment to Vercel

OmniRetail is configured for zero-configuration deployment to Vercel:

```bash
# Using Vercel CLI
vercel --prod
```

Or deploy directly via the [Vercel Dashboard](https://vercel.com/new).

---

## 📄 License
MIT License. Built with ❤️ for modern retail operators.
