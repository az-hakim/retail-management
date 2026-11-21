# Authentication & Authorization

This document describes how OmniRetail authenticates users, how tenant and branch scope
is enforced, and what must be configured before running the app in production.

- [Design goals](#design-goals)
- [Session model](#session-model)
- [Request lifecycle](#request-lifecycle)
- [Authorization model](#authorization-model)
- [Login protection](#login-protection)
- [CSRF protection](#csrf-protection)
- [API contract](#api-contract)
- [Configuration](#configuration)
- [Seeded accounts](#seeded-accounts)
- [Threat model](#threat-model)
- [Production checklist](#production-checklist)
- [Extending the system](#extending-the-system)

---

## Design goals

1. **No trusted client identity.** The browser cannot state who it is or which role it has.
   Only the user id inside a signed cookie is accepted, and everything else is looked up
   server-side.
2. **Defense in depth.** The Proxy performs an optimistic check for unauthenticated traffic;
   every route independently verifies the token and re-checks authorization.
3. **Fail closed.** Missing production configuration disables sign-in rather than falling
   back to an insecure default.
4. **Small dependency surface.** Password hashing and token signing use Node's built-in
   `crypto`; no JWT library is required.

---

## Session model

| Property | Value |
| :--- | :--- |
| Token format | `base64url(payload) + "." + base64url(HMAC-SHA256(payload))` |
| Payload | `{ sub: userId, sid: opaque session id, iat, exp }` |
| Signing key | `AUTH_SESSION_SECRET` (32+ chars; dev fallback outside production) |
| Lifetime | `AUTH_SESSION_TTL_HOURS` hours (default **12**, minimum 15 minutes) |
| Cookie name | `__Host-omniretail_session` (production) / `omniretail_session` (development) |
| Cookie flags | `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/` |
| Storage | Stateless — nothing is stored server-side |

The payload deliberately contains **no tenant, role or branch**. Those are resolved from
`src/lib/store.ts` on each request, so revoking a role or membership takes effect on the
next call instead of at token expiry.

Verification is constant-time (`constantTimeEqual`) and rejects malformed, truncated,
tampered or expired tokens. Because sessions are stateless, logout clears the cookie but
does not invalidate an already-issued token; see [Production checklist](#production-checklist).

### Sign-in flow

```
Browser                     POST /api/auth/login                 Store
   │  email + password  ─────────────►                                │
   │                                   check throttle (IP + email)    │
   │                                   authenticate() ────────────────►│ scrypt verify
   │                                   resolve memberships            │
   │  ◄── 200 { user, memberships } + Set-Cookie: session ────────────│
   │                                                                  │
   │  window.location.assign('/')  →  Proxy sees cookie  →  app shell  │
   │                                   GET /api/auth/session ─────────►│ verify HMAC
```

The client performs a full document load after sign-in so the app shell boots with the new
cookie and `AppProvider` reads the session exactly once.

---

## Request lifecycle

1. **Proxy** (`src/proxy.ts`)
   * `/api/auth/*` and `/login` pass through.
   * No session cookie → `401` JSON for `/api/*`, redirect to `/login?next=…` for pages.
   * Static assets and Next internals are excluded by the matcher.
2. **Route handler** calls `getTenantContext(req, options)` or `getAuthenticatedRequest(req)`.
3. **CSRF check** — non-GET requests must be same-origin (see below).
4. **Token verification** — signature, expiry, then user lookup.
5. **Account state** — inactive users are rejected with `403 AccountDisabled`.
6. **Tenant resolution** — `resolveAccess(user, requestedTenantId, tenants)`.
7. **Role check** — `requiredRole` is compared against the membership role; `SUPER_ADMIN`
   always passes.
8. **Branch check** — `requiredBranchId` (and explicit per-route checks) compare against the
   membership's allowed branches.
9. **Handler** receives `{ tenantId, tenant, user, access, clientIp }` and never reads
   identity from the body, query string or arbitrary headers.

`x-tenant-id` is treated as a *request* to act in a tenant, not as an authorization claim.
If the user has no membership there, the resolver falls back to their own membership rather
than honouring the header.

---

## Authorization model

Access is granted by **memberships**, not by a global role column:

```ts
interface UserMembership {
  tenant_id: string;
  role: 'SUPER_ADMIN' | 'TENANT_OWNER' | 'BRANCH_MANAGER' | 'CASHIER' | 'INVENTORY_CLERK';
  branch_id?: string; // optional: limits the membership to one branch
}
```

* `SUPER_ADMIN` may act in any **active** tenant.
* A member may only act in tenants they hold a membership for.
* A membership with `branch_id` yields `allowedBranchIds = [branch_id]`; everything else
  yields `null` (all branches in the tenant).
* Suspended tenants (`status: 'SUSPENDED'`) are filtered out entirely.
* Inactive users resolve to no access.

### Where it is enforced

| Layer | File | Responsibility |
| :--- | :--- | :--- |
| Route gate | `src/proxy.ts` | Unauthenticated traffic |
| Request auth | `src/lib/tenant-context.ts` | Token, account state, CSRF, tenant/role/branch |
| Access rules | `src/lib/authz.ts` | Pure membership resolution (unit tested) |
| Data access | `src/lib/store.ts` | Every query filters by `tenant_id` |
| UI | `src/context/AppContext.tsx` | Hides actions the role cannot perform |

The UI uses the role only to hide controls. Every action is authorized again on the server —
removing a button is never the security boundary.

---

## Login protection

`src/lib/auth/login-throttle.ts` keeps two sliding windows per attempt:

| Key | Limit | Window / lock |
| :--- | :--- | :--- |
| `email:<address>` | 5 failures | 15 minutes |
| `ip:<client ip>` | 25 failures | 15 minutes |

* Successful sign-in clears both keys.
* Throttled attempts return `429 TooManyAttempts` with `Retry-After` (seconds) and a human
  readable message. This response is returned **before** password verification, so a locked
  account cannot be used to test passwords.
* The per-IP limit is intentionally looser than the per-account limit so shared office or
  carrier NAT addresses are not locked out by one person's typos.
* The same generic message (`Invalid email or password.`) is returned for unknown accounts
  and wrong passwords, and unknown accounts still pay the scrypt cost via a dummy hash.

The map is process-local. With more than one instance, replace it with Redis (or any shared
counter) using the same keys and limits.

---

## CSRF protection

`assertSameOrigin(req)` runs for every non-`GET`/`HEAD`/`OPTIONS` request:

* If `Origin` is present, its host must equal the request host
  (`x-forwarded-host` or `host`). Mismatch → `403 InvalidOrigin`.
* If `Sec-Fetch-Site` is present, it must be `same-origin`, `same-site` or `none`;
  `cross-site` is rejected.
* Requests without either header (server-to-server, CLI) are allowed, because browsers
  always send `Origin` on cross-origin non-GET requests.

Combined with `SameSite=Lax` cookies, a third-party page cannot drive authenticated
mutations.

---

## API contract

### `POST /api/auth/login`

```jsonc
// request
{ "email": "alex@apexgear.com", "password": "DemoPass123!" }

// 200
{
  "user": { "id": "…", "name": "Alexander Wright", "email": "…", "role": "TENANT_OWNER",
            "tenant_id": "…", "is_active": true, "memberships": [ … ] },
  "memberships": [ { "tenant": { … }, "role": "TENANT_OWNER" } ],
  "activeTenantId": "…",
  "role": "TENANT_OWNER"
}
// Set-Cookie: __Host-omniretail_session=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200
```

| Status | Error code | Cause |
| :--- | :--- | :--- |
| `400` | `MissingCredentials` / `InvalidBody` | Missing fields or non-JSON body |
| `401` | `InvalidCredentials` | Unknown email, wrong password, malformed email |
| `403` | `NoWorkspace` | Account has no active membership |
| `429` | `TooManyAttempts` | Throttled (see `Retry-After`) |
| `503` | `AuthNotConfigured` | Production without `AUTH_SESSION_SECRET` |

### `POST /api/auth/logout`

Clears the cookie. Requires a same-origin request; always returns `200 { success: true }`.

### `GET /api/auth/session`

Returns the current user, the memberships the UI may switch to, the resolved active tenant
and role. Honours `x-tenant-id` (or `?tenant_id=`) to restore the selected workspace.
Responses are `Cache-Control: no-store`.

### Protected routes

Every other `/api/*` route returns:

| Status | Error code | Cause |
| :--- | :--- | :--- |
| `401` | `Unauthenticated` | Missing, invalid, tampered or expired session |
| `403` | `AccountDisabled` | User deactivated |
| `403` | `Forbidden` | Role not permitted for the operation |
| `403` | `BranchForbidden` | Branch outside the membership scope |
| `403` | `InvalidOrigin` / `CrossSiteRequestBlocked` | CSRF guard |

---

## Configuration

| Variable | Required | Default | Notes |
| :--- | :--- | :--- | :--- |
| `AUTH_SESSION_SECRET` | Production | dev fallback | 32+ characters. `openssl rand -hex 32` |
| `AUTH_SESSION_TTL_HOURS` | No | `12` | Clamped to a minimum of 15 minutes |
| `AUTH_SEED_PASSWORD` | No | `DemoPass123!` (dev only) | Password for seeded demo accounts |

`NODE_ENV=production` also switches the cookie to the `__Host-` prefix and enables `Secure`.

If `AUTH_SEED_PASSWORD` is unset in production, seeded accounts receive a random password
generated at boot and cannot be signed into. This keeps demo credentials out of production
while still letting the app boot.

---

## Seeded accounts

| Email | Role | Scope |
| :--- | :--- | :--- |
| `alex@apexgear.com` | `TENANT_OWNER` | Apex Electronics (both branches) |
| `sarah.cashier@apexgear.com` | `CASHIER` | Apex — Flagship Downtown only |
| `marcus.stock@apexgear.com` | `INVENTORY_CLERK` | Apex Electronics |
| `owner@freshmart.com` | `TENANT_OWNER` | FreshMart |
| `owner@novapharma.com` | `TENANT_OWNER` | Nova Health |
| `admin@omniretail.app` | `SUPER_ADMIN` | All tenants |

Passwords are hashed with scrypt during store initialisation; plaintext passwords exist only
in `AUTH_SEED_PASSWORD` (or the development constant). Use the cashier account to verify
branch scoping: the branch selector shows one outlet and cross-branch mutations return
`403 BranchForbidden`.

---

## Threat model

| Threat | Mitigation |
| :--- | :--- |
| Forged session cookie | HMAC-SHA256 signature with a 32+ character secret; constant-time compare |
| Stolen token reuse after logout | Short TTL; add a revocation list for instant invalidation (see below) |
| Cross-tenant data access | Tenant resolved from memberships; every store query filters by `tenant_id` |
| Privilege escalation by header | Role never read from headers; only membership records |
| Branch hopping | Branch-scoped memberships validated on every read and mutation |
| Password database leak | scrypt with per-user salt; no plaintext passwords stored |
| Credential stuffing / brute force | Per-account and per-IP throttling with lockout |
| Account enumeration | Identical errors and dummy hash for unknown accounts |
| CSRF | Same-origin enforcement + `SameSite=Lax` |
| Clickjacking | `X-Frame-Options: DENY` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Protocol downgrade | HSTS with preload |
| Session fixation | A fresh random `sid` is minted on every sign-in |

---

## Production checklist

- [ ] Set `AUTH_SESSION_SECRET` (32+ bytes of entropy) in the hosting environment.
- [ ] Set `AUTH_SEED_PASSWORD` **or** replace seeded users with real accounts.
- [ ] Confirm the deployment serves HTTPS (required by `Secure` cookies and `__Host-`).
- [ ] Move the data store to PostgreSQL and enable the RLS policies in `schema.sql`.
- [ ] Move login throttling to a shared store (Redis) when running more than one instance.
- [ ] Add a session revocation list (or database-backed sessions) if instant global sign-out
      is required, since stateless tokens remain valid until expiry.
- [ ] Add audit logging for sign-in success/failure to your SIEM.
- [ ] Rate-limit `/api/auth/login` at the edge/CDN as an extra layer.
- [ ] Rotate `AUTH_SESSION_SECRET` periodically; rotation invalidates all sessions.

---

## Extending the system

**Add a member to an existing tenant**

The in-memory store has no user-creation endpoint yet; add the record to the seeded
`users` array (or implement it in your PostgreSQL adapter) with a hashed password:

```ts
users.push({
  id: generateUUIDv7(),
  tenant_id,
  name: 'New Manager',
  email: 'manager@apexgear.com',
  role: 'BRANCH_MANAGER',
  is_active: true,
  memberships: [{ tenant_id, role: 'BRANCH_MANAGER', branch_id }],
  password_hash: hashPassword(password),
});
```

**Protect a new route**

```ts
import { getTenantContext } from '@/lib/tenant-context';

export async function POST(req: NextRequest) {
  const { error, context } = await getTenantContext(req, {
    requiredRole: ['TENANT_OWNER', 'BRANCH_MANAGER'],
    requiredBranchId: body.branch_id, // optional branch assertion
  });
  if (error || !context) return error;

  // context.tenantId, context.user, context.access.allowedBranchIds are trustworthy
}
```

**Add a role** — extend `UserRole` in `src/types/index.ts`, then add it to the
`requiredRole` arrays of the routes it may call. The Proxy and session layer need no changes.
