# OmniRetail — Multi-Tenant Cloud POS & Retail Inventory Management SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Auth](https://img.shields.io/badge/Auth-HMAC%20sessions%20%2B%20scrypt-green)](#-authentication--authorization)
[![Vercel](https://img.shields.io/badge/Live_Demo-Vercel-black?logo=vercel)](https://retail-management-coral.vercel.app)

A multi-tenant SaaS for local retail businesses (electronics, supermarkets, pharmacies,
apparel, hardware). OmniRetail provides barcode-first POS billing, offline-resilient
sales sync, an immutable stock ledger, branch-to-branch transfers, automated Goods
Received Notes (GRN), and role-based access control scoped per tenant and branch.

🔗 **Live demo:** [https://retail-management-coral.vercel.app](https://retail-management-coral.vercel.app)

---

## 🚀 Key Features

### 1. Authentication & Zero-Trust Tenant Isolation
* **Signed HTTP-only sessions** — HMAC-SHA256 tokens, `Secure`/`SameSite=Lax`, `__Host-`
  cookie prefix in production. No client-supplied identity is ever trusted.
* **Server-side authorization** — tenant, role and branch scope are re-resolved from the
  user record on every request (`src/lib/tenant-context.ts`).
* **Membership-based tenant switching** — the switcher can only reach tenants the user is
  a member of; requesting a foreign tenant id falls back to an authorized one.
* **Branch-scoped roles** — a cashier assigned to one outlet cannot read or mutate another.
* **Brute-force protection and CSRF hardening** — per-account/per-IP login throttling and
  same-origin enforcement on state-changing requests.

### 2. Barcode-First Point of Sale (POS) & Offline Resilience
* **Hardware & keyboard scanner support** — USB/Bluetooth handheld scanners (EAN-13, UPC,
  Code-128) plus a `/` hotkey and on-screen presets.
* **Audio feedback** — synthesized scan confirmation and error beeps via the Web Audio API.
* **Offline-first resilience** — transactions queue in browser storage with time-ordered
  `UUIDv7` idempotency keys and sync automatically when connectivity returns.
* **Split tender & payments** — cash with change calculator and quick denominations,
  cards, mobile wallets and store credit.
* **ESC/POS thermal receipts** — print styling for 58mm and 80mm rolls.
* **Cashier shift close (Z-report)** — opening float, tender breakdown, discount audit,
  drawer reconciliation.

### 3. Immutable Stock Ledger & Multi-Branch Inventory
* **Immutable double-entry rule** — stock is never silently overwritten; every change
  appends a ledger row (`PURCHASE_IN`, `SALE_OUT`, `RETURN_IN`, `DAMAGE_OUT`, `ADJUSTMENT`,
  `TRANSFER_IN`, `TRANSFER_OUT`).
* **Branch-to-branch transfers** — atomic two-sided ledger entries with tenant/branch
  authorization checks.
* **Cost valuation** — historical cost snapshots for FIFO / weighted-average COGS.

### 4. Batch & Expiration Tracking (FEFO)
* First-Expired, First-Out deduction with batch numbers, manufacturing dates and expiry
  countdowns.
* Near-expiry watchlist for products within 30 days of expiration.

### 5. Procurement, Suppliers & Automated GRN
* Purchase order lifecycle: `DRAFT` ➔ `ORDERED` ➔ `PARTIAL_RECEIVED` ➔ `COMPLETED`.
* Receiving goods updates stock and posts `PURCHASE_IN` ledger entries.
* Accounts payable tracking per supplier.

### 6. RBAC & Security Audit Trail
* Roles: `SUPER_ADMIN`, `TENANT_OWNER`, `BRANCH_MANAGER`, `CASHIER`, `INVENTORY_CLERK`.
* Automatic audit entries for manual price overrides, discounts above 10%, stock
  adjustments, transfers and GRN receipts.

### 7. Modern UI (2026 design pass)
* Responsive shell: full sidebar on desktop, icon rail on tablets, bottom navigation on
  mobile; glass header; dark mode; reduced-motion support; skip-friendly focus rings.
* Compact, keyboard-driven architecture flow view (←/→, Space, Home, Reset).

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 16.4 (App Router, Route Handlers, Proxy), React 19 |
| Styling | Tailwind CSS v4, Lucide icons |
| Auth | Node `crypto` — scrypt password hashing + HMAC-SHA256 session signing |
| Persistence | In-memory store (`src/lib/store.ts`) with a reference PostgreSQL/Prisma schema |
| Testing | Node.js test runner via `tsx` (`npm test`) |

---

## 🏁 Getting Started

### Prerequisites
* Node.js 20+ (22 recommended)
* npm 10+

### Installation

```bash
git clone https://github.com/az-hakim/retail-management.git
cd retail-management

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

### Sign in (development)

Development seeds six accounts with the password `DemoPass123!`:

| Email | Role | Tenant |
| :--- | :--- | :--- |
| `alex@apexgear.com` | Tenant Owner | Apex Electronics |
| `sarah.cashier@apexgear.com` | Cashier (single branch) | Apex Electronics |
| `marcus.stock@apexgear.com` | Inventory Clerk | Apex Electronics |
| `owner@freshmart.com` | Tenant Owner | FreshMart |
| `owner@novapharma.com` | Tenant Owner | Nova Health |
| `admin@omniretail.app` | Platform Super Admin | all tenants |

`AUTH_SESSION_SECRET` is optional in development (an insecure dev fallback is used) and
**required in production**. `AUTH_SEED_PASSWORD` overrides the seeded password.

### Environment variables

Create `.env.local` (see `.env.example`):

```bash
# Required in production. Generate with: openssl rand -hex 32
AUTH_SESSION_SECRET=

# Optional (defaults shown)
AUTH_SESSION_TTL_HOURS=12
AUTH_SEED_PASSWORD=
```

---

## 🔐 Authentication & Authorization

Full design notes, threat model and API contract: **[docs/authentication.md](docs/authentication.md)**.

* **Sessions** — HMAC-SHA256 signed tokens carrying only `sub` (user id), `sid`, `iat`,
  `exp`. Tenant, role and branch are never taken from the token or from headers; they are
  looked up per request so a role change applies immediately.
* **Cookies** — `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, 12h TTL,
  `__Host-omniretail_session` in production.
* **Passwords** — scrypt with a unique salt and constant-time comparison. Unknown accounts
  still run a dummy hash, so response timing does not reveal which emails exist.
* **Throttling** — 5 failures per account / 25 per IP within 15 minutes, `Retry-After`
  returned on 429.
* **CSRF** — non-GET requests must be same-origin (`Origin` / `Sec-Fetch-Site`).
* **Route protection** — `src/proxy.ts` returns `401` for unauthenticated `/api/*` calls and
  redirects page requests to `/login?next=…` before any handler runs. Handlers then verify
  the token and authorization again (defense in depth).
* **Fail-closed** — without `AUTH_SESSION_SECRET` in production, sign-in returns `503
  AuthNotConfigured` instead of issuing forgeable tokens.

### Authorization matrix

| Capability | SUPER_ADMIN | TENANT_OWNER | BRANCH_MANAGER | CASHIER | INVENTORY_CLERK |
| :--- | :-: | :-: | :-: | :-: | :-: |
| Switch to any tenant | ✅ | — | — | — | — |
| Read catalog / branches | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create products | ✅ | ✅ | ✅ | — | ✅ |
| Stock adjust / transfer | ✅ | ✅ | ✅ | — | ✅ |
| POS checkout | ✅ | ✅ | ✅ | ✅ | — |
| Purchase orders / GRN | ✅ | ✅ | ✅ | — | ✅ |
| Reports | ✅ | ✅ | ✅ | — | — |
| Audit logs | ✅ | ✅ | ✅ | — | — |
| Tenant settings | ✅ | ✅ | — | — | — |

Branch-assigned memberships (for example a cashier) are further limited to their own
branch: branch lists are filtered and every mutation validates the target branch.

---

## 📡 API Reference

All routes require a valid session cookie unless noted. Mutations must be same-origin.

| Method & path | Scope | Notes |
| :--- | :--- | :--- |
| `POST /api/auth/login` | Public | `{ email, password }` → sets session cookie |
| `POST /api/auth/logout` | Session | Clears the cookie |
| `GET /api/auth/session` | Session | Current user, memberships, active tenant |
| `GET /api/tenants` | Session | Tenants the user belongs to |
| `PUT /api/tenants` | Owner / Super Admin | Update settings of the active tenant |
| `GET /api/branches` | Session | Branch-scope filtered |
| `GET /api/products` | Session | Filter by `search`, `category_id`, `branch_id`, `barcode` |
| `POST /api/products` | Owner / Manager / Clerk | Tenants-unique SKU and barcode |
| `GET /api/pos/checkout` | Session | Sales history (branch scoped) |
| `POST /api/pos/checkout` | Cashier + | Requires `X-Idempotency-Key` |
| `GET /api/inventory/ledger` | Session | Immutable ledger, branch scoped |
| `POST /api/inventory/adjust` | Owner / Manager / Clerk | Reason (5+ chars) required, audited |
| `POST /api/inventory/transfer` | Owner / Manager / Clerk | Two-sided ledger, branch checked |
| `GET` / `POST /api/purchase-orders` | Session / stock roles | Supplier list included on GET |
| `POST /api/purchase-orders/receive` | Owner / Manager / Clerk | GRN intake, branch checked |
| `GET /api/reports` | Session | Summary KPIs, low stock, expiry watch |
| `GET /api/audit-logs` | Owner / Manager / Super Admin | Tenant audit trail |

Errors are JSON: `{ "error": "Code", "message": "…" }` with `401 Unauthenticated`,
`403 Forbidden`/`BranchForbidden`/`InvalidOrigin`, `404`, `429 TooManyAttempts`.

---

## 🧪 Testing

```bash
npm test
```

The suite (18 tests) covers:
* Tenant isolation — catalog, barcode lookup, POS deductions, transfers, ledger partitioning.
* Idempotent checkout — duplicate keys never double-deduct stock.
* Password hashing — round-trip, wrong password, malformed hashes, unique salts.
* Sessions — signed-token round-trip and rejection of tampered/truncated/missing tokens.
* Credentials — seeded sign-in, bad passwords, case-insensitive email lookup.
* Authorization — cross-tenant fallback, super-admin tenant selection, branch scoping,
  membership listing, inactive accounts.

Type-checking and linting run as part of `npm run build` and `npm run lint`.

---

## 📦 Database Schema (reference)

The runtime store is in-memory, but the production schema is included:

* **`schema.sql`** — PostgreSQL DDL with `ENABLE ROW LEVEL SECURITY` and
  `tenant_isolation_policy` on every tenant-scoped table.
* **`prisma/schema.prisma`** — Prisma models with composite indexes leading with `tenant_id`.

Moving to PostgreSQL requires implementing the adapter behind `src/lib/store.ts`; the route
handlers and authorization layer do not change.

---

## 🚢 Deployment (Vercel)

```bash
vercel --prod
```

Set the following environment variables in the Vercel project before the first sign-in:

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `AUTH_SESSION_SECRET` | ✅ production | Session signing key, 32+ chars (`openssl rand -hex 32`) |
| `AUTH_SEED_PASSWORD` | optional | Password for the seeded demo accounts |
| `AUTH_SESSION_TTL_HOURS` | optional | Session lifetime in hours (default 12) |

Without `AUTH_SEED_PASSWORD` in production, seeded accounts receive a random per-boot
password and cannot be used — sign-in fails closed by design.

Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
Permissions-Policy) are applied globally from `next.config.ts`.

---

## 📁 Project Structure

```
src/
├─ app/
│  ├─ api/auth/{login,logout,session}/   authentication endpoints
│  ├─ api/{tenants,branches,products,…}/ authenticated business API
│  ├─ login/                             sign-in page
│  └─ page.tsx                           authenticated workspace shell
├─ components/                           POS, catalog, inventory, procurement, UI shell
├─ context/AppContext.tsx                session bootstrap + tenant/branch state
├─ lib/
│  ├─ auth/{session,password,token,login-throttle}.ts
│  ├─ authz.ts                           tenant/branch access resolution
│  ├─ tenant-context.ts                  request authentication + CSRF + RBAC
│  └─ store.ts                           data store and domain rules
├─ proxy.ts                              optimistic route gate
tests/                                   tenant isolation + auth suites
docs/                                    authentication and operations docs
```

---

## ⚠️ Known Limitations

* **In-memory data store** — state resets on restart and is not shared across serverless
  instances. Use PostgreSQL/RLS for production data.
* **Per-process login throttling** — move counters to Redis when running multiple
  instances.
* **Stateless sessions** — logout clears the cookie; existing tokens remain valid until
  expiry. Add a revocation list (or database sessions) if instant global sign-out is
  required.

---

## 📄 License

MIT License. Built with ❤️ for modern retail operators.
