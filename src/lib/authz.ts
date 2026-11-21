import { Tenant, User, UserMembership, UserRole } from '@/types';

export interface ResolvedAccess {
  tenant: Tenant;
  role: UserRole;
  /** The membership granting access. `undefined` only for SUPER_ADMIN. */
  membership?: UserMembership;
  /** `null` means every branch in the tenant. */
  allowedBranchIds: string[] | null;
}

/**
 * Resolves which tenant a user may act in. The requested tenant is only
 * honoured when the user actually holds a membership for it — the client can
 * never widen its own scope.
 */
export function resolveAccess(
  user: User,
  requestedTenantId: string | null | undefined,
  tenants: Tenant[]
): ResolvedAccess | null {
  if (!user.is_active) return null;

  const activeTenants = tenants.filter(t => t.status === 'ACTIVE');

  if (user.role === 'SUPER_ADMIN') {
    const tenant =
      activeTenants.find(t => t.id === requestedTenantId) ??
      activeTenants.find(t => t.id === user.tenant_id) ??
      activeTenants[0];
    if (!tenant) return null;
    return { tenant, role: 'SUPER_ADMIN', allowedBranchIds: null };
  }

  const memberships = user.memberships ?? [];
  if (memberships.length === 0) return null;

  const membership =
    (requestedTenantId ? memberships.find(m => m.tenant_id === requestedTenantId) : undefined) ??
    memberships.find(m => m.tenant_id === user.tenant_id) ??
    memberships[0];

  const tenant = activeTenants.find(t => t.id === membership.tenant_id);
  if (!tenant) return null;

  return {
    tenant,
    role: membership.role,
    membership,
    allowedBranchIds: membership.branch_id ? [membership.branch_id] : null,
  };
}

export interface TenantMembership {
  tenant: Tenant;
  role: UserRole;
  branch_id?: string;
}

/** Every tenant the user may switch to, with the role held in each. */
export function listAccessibleMemberships(user: User, tenants: Tenant[]): TenantMembership[] {
  const active = tenants.filter(t => t.status === 'ACTIVE');

  if (user.role === 'SUPER_ADMIN') {
    return active.map(tenant => ({ tenant, role: 'SUPER_ADMIN' as UserRole }));
  }

  return (user.memberships ?? []).flatMap(membership => {
    const tenant = active.find(t => t.id === membership.tenant_id);
    if (!tenant) return [];
    return [{ tenant, role: membership.role, branch_id: membership.branch_id }];
  });
}

export function isBranchAllowed(access: ResolvedAccess, branchId: string | undefined): boolean {
  if (!branchId) return false;
  return access.allowedBranchIds === null || access.allowedBranchIds.includes(branchId);
}

export function hasRole(access: ResolvedAccess, allowed: UserRole[]): boolean {
  return access.role === 'SUPER_ADMIN' || allowed.includes(access.role);
}
