import { test, describe } from 'node:test';
import assert from 'node:assert';
import { db } from '../src/lib/store';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import { createSessionToken, verifySessionToken } from '../src/lib/auth/session';
import { listAccessibleMemberships, resolveAccess } from '../src/lib/authz';
import { generateUUIDv7 } from '../src/lib/utils';

const APEX = '018dc600-7000-7000-8000-000000000001';
const FRESHMART = '018dc600-7000-7000-8000-000000000002';

describe('Authentication: password hashing', () => {
  test('hashes and verifies a password', () => {
    const hash = hashPassword('CorrectHorseBattery9');
    assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$/);
    assert.strictEqual(verifyPassword('CorrectHorseBattery9', hash), true);
    assert.strictEqual(verifyPassword('correcthorsebattery9', hash), false);
  });

  test('rejects malformed or missing hashes', () => {
    assert.strictEqual(verifyPassword('anything', undefined), false);
    assert.strictEqual(verifyPassword('anything', ''), false);
    assert.strictEqual(verifyPassword('anything', 'scrypt$nope'), false);
    assert.strictEqual(verifyPassword('anything', 'bcrypt$16384$8$1$salt$hash'), false);
  });

  test('uses a unique salt per hash', () => {
    assert.notStrictEqual(hashPassword('same-password'), hashPassword('same-password'));
  });
});

describe('Authentication: sessions', () => {
  test('round-trips a signed session token', async () => {
    const token = await createSessionToken('user-123', generateUUIDv7());
    const payload = await verifySessionToken(token);
    assert.ok(payload, 'token should verify');
    assert.strictEqual(payload?.sub, 'user-123');
    assert.ok((payload?.exp ?? 0) > Math.floor(Date.now() / 1000));
  });

  test('rejects tampered, truncated and missing tokens', async () => {
    const token = await createSessionToken('user-123', generateUUIDv7());
    const [body, signature] = token.split('.');

    const forgedBody = Buffer.from(
      JSON.stringify({ sub: 'attacker', sid: 'x', iat: 0, exp: 9999999999 })
    ).toString('base64url');

    assert.strictEqual(await verifySessionToken(`${forgedBody}.${signature}`), null);
    assert.strictEqual(await verifySessionToken(`${body}.deadbeef`), null);
    assert.strictEqual(await verifySessionToken(body), null);
    assert.strictEqual(await verifySessionToken(undefined), null);
    assert.strictEqual(await verifySessionToken(''), null);
  });
});

describe('Authentication: credentials', () => {
  test('authenticates a seeded account and rejects bad passwords', () => {
    const user = db.authenticate('alex@apexgear.com', 'DemoPass123!');
    assert.ok(user, 'seed owner should authenticate in development');
    assert.strictEqual(user?.email, 'alex@apexgear.com');
    assert.strictEqual(db.authenticate('alex@apexgear.com', 'wrong-password'), null);
    assert.strictEqual(db.authenticate('nobody@example.com', 'DemoPass123!'), null);
  });

  test('email lookup is case-insensitive and whitespace tolerant', () => {
    assert.ok(db.authenticate('  ALEX@APEXGEAR.COM ', 'DemoPass123!'));
  });
});

describe('Authorization: tenant and branch scope', () => {
  test('a user cannot enter a tenant they have no membership in', () => {
    const user = db.findUserByEmail('alex@apexgear.com')!;
    const access = resolveAccess(user, FRESHMART, db.getTenants());
    assert.ok(access);
    assert.strictEqual(access?.tenant.id, APEX, 'must fall back to an authorized tenant');
  });

  test('super admin may select any active tenant', () => {
    const admin = db.findUserByEmail('admin@omniretail.app')!;
    const access = resolveAccess(admin, FRESHMART, db.getTenants());
    assert.strictEqual(access?.tenant.id, FRESHMART);
    assert.strictEqual(access?.role, 'SUPER_ADMIN');
  });

  test('a branch-assigned cashier is scoped to that branch', () => {
    const cashier = db.findUserByEmail('sarah.cashier@apexgear.com')!;
    const access = resolveAccess(cashier, APEX, db.getTenants());
    assert.deepStrictEqual(access?.allowedBranchIds, ['018dc600-7001-7000-8000-000000000001']);

    const owner = db.findUserByEmail('alex@apexgear.com')!;
    const ownerAccess = resolveAccess(owner, APEX, db.getTenants());
    assert.strictEqual(ownerAccess?.allowedBranchIds, null);
  });

  test('membership listing never leaks other tenants', () => {
    const user = db.findUserByEmail('alex@apexgear.com')!;
    const memberships = listAccessibleMemberships(user, db.getTenants());
    assert.strictEqual(memberships.length, 1);
    assert.strictEqual(memberships[0].tenant.id, APEX);
  });

  test('inactive users resolve to no access', () => {
    const user = { ...db.findUserByEmail('alex@apexgear.com')!, is_active: false };
    assert.strictEqual(resolveAccess(user, APEX, db.getTenants()), null);
  });
});
