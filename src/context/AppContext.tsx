'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Tenant, Branch, UserRole, Product, Category, StockLedgerEntry, Sale, Supplier, PurchaseOrder, AuditLog, UserMembership } from '@/types';
import { offlineSync } from '@/lib/offline-sync';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  branch_id?: string;
  memberships: UserMembership[];
}

export interface SessionMembership {
  tenant: Tenant;
  role: UserRole;
  branch_id?: string;
}

interface AppContextType {
  user: SessionUser | null;
  memberships: SessionMembership[];
  logout: () => Promise<void>;

  tenants: Tenant[];
  activeTenant: Tenant | null;
  setActiveTenant: (t: Tenant) => void;
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (b: Branch) => void;
  userRole: UserRole;
  userName: string;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  offlineQueueCount: number;
  syncOfflineSales: () => Promise<void>;
  isSyncing: boolean;

  // Data State
  products: Product[];
  categories: Category[];
  ledger: StockLedgerEntry[];
  sales: Sale[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  auditLogs: AuditLog[];
  reportsSummary: any;
  loading: boolean;

  // Data actions
  refreshAllData: () => Promise<void>;
  findProductByBarcode: (barcode: string) => { product: Product; variant?: any } | null;
}

const AppContext = createContext<AppContextType | null>(null);

function redirectToLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.replace('/login');
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [memberships, setMemberships] = useState<SessionMembership[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);

  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportsSummary, setReportsSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const userRole: UserRole = useMemo(() => {
    if (!user) return 'CASHIER';
    const membership = memberships.find(m => m.tenant.id === activeTenant?.id);
    return membership?.role ?? user.role;
  }, [user, memberships, activeTenant]);

  const userName = user?.name ?? '';

  // Authenticate the browser against the signed session cookie.
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      // The sign-in page has no session yet; do not probe it from there.
      if (window.location.pathname.startsWith('/login')) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (res.status === 401 || res.status === 403) {
          redirectToLogin();
          return;
        }
        if (!res.ok) throw new Error(`Session request failed (${res.status})`);

        const data = await res.json();
        if (cancelled) return;

        const nextMemberships: SessionMembership[] = data.memberships ?? [];
        setUser(data.user);
        setMemberships(nextMemberships);
        setTenants(nextMemberships.map(m => m.tenant));

        const initial =
          nextMemberships.find(m => m.tenant.id === data.activeTenantId) ?? nextMemberships[0];
        setActiveTenantState(initial?.tenant ?? null);
      } catch (err) {
        console.error('Failed to load session:', err);
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize offline state
  useEffect(() => {
    setIsSimulatedOffline(offlineSync.isSimulatedOffline());

    const updateQueue = () => {
      if (activeTenant) {
        setOfflineQueueCount(offlineSync.getQueuedSales(activeTenant.id).length);
      }
    };

    updateQueue();
    window.addEventListener('offline-queue-change', updateQueue);
    window.addEventListener('offline-state-change', () => {
      setIsSimulatedOffline(offlineSync.isSimulatedOffline());
    });

    return () => {
      window.removeEventListener('offline-queue-change', updateQueue);
    };
  }, [activeTenant]);

  // When the active tenant changes, fetch branches & data
  const refreshAllData = useCallback(async () => {
    if (!activeTenant) return;
    setLoading(true);

    const headers: Record<string, string> = {
      'x-tenant-id': activeTenant.id,
    };

    const get = async (url: string) => {
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        const body = await res.clone().json().catch(() => null);
        if (body?.error === 'Unauthenticated' || body?.error === 'AccountDisabled') {
          redirectToLogin();
        }
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    };

    try {
      // 1. Branches
      const dataB = await get('/api/branches');
      if (dataB?.branches) {
        setBranches(dataB.branches);
        if (!activeBranch || !dataB.branches.some((b: Branch) => b.id === activeBranch.id)) {
          setActiveBranchState(dataB.branches[0] || null);
        }
      }

      // 2. Products & Categories
      const dataP = await get('/api/products');
      if (dataP?.products) setProducts(dataP.products);
      if (dataP?.categories) setCategories(dataP.categories);

      // 3. Sales
      const dataS = await get('/api/pos/checkout');
      if (dataS?.sales) setSales(dataS.sales);

      // 4. Ledger
      const dataL = await get('/api/inventory/ledger');
      if (dataL?.entries) setLedger(dataL.entries);

      // 5. Purchase Orders
      const dataPO = await get('/api/purchase-orders');
      if (dataPO?.purchaseOrders) setPurchaseOrders(dataPO.purchaseOrders);
      if (dataPO?.suppliers) setSuppliers(dataPO.suppliers);

      // 6. Reports Summary
      const dataR = await get('/api/reports');
      if (dataR?.summary) setReportsSummary(dataR.summary);

      // 7. Audit logs (role gated server-side)
      if (['TENANT_OWNER', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
        const dataA = await get('/api/audit-logs');
        if (dataA?.logs) setAuditLogs(dataA.logs);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTenant, activeBranch, userRole]);

  useEffect(() => {
    if (activeTenant) {
      refreshAllData();
      setOfflineQueueCount(offlineSync.getQueuedSales(activeTenant.id).length);
    }
  }, [activeTenant, refreshAllData]);

  const setActiveTenant = (t: Tenant) => {
    setActiveTenantState(t);
    setActiveBranchState(null);
  };

  const setActiveBranch = (b: Branch) => {
    setActiveBranchState(b);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clearing the cookie server-side failed; still send the user to sign-in.
    }
    setUser(null);
    setMemberships([]);
    redirectToLogin();
  };

  const toggleSimulatedOffline = () => {
    const next = !isSimulatedOffline;
    setIsSimulatedOffline(next);
    offlineSync.setSimulatedOffline(next);
  };

  const syncOfflineSales = async () => {
    if (!activeTenant) return;
    setIsSyncing(true);
    try {
      await offlineSync.syncAllQueuedSales(activeTenant.id);
      await refreshAllData();
      setOfflineQueueCount(offlineSync.getQueuedSales(activeTenant.id).length);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const findProductByBarcode = (barcode: string) => {
    const q = barcode.trim();
    for (const p of products) {
      if (p.barcode === q || p.sku.toLowerCase() === q.toLowerCase()) {
        return { product: p };
      }
      if (p.variants) {
        const v = p.variants.find(item => item.barcode === q || item.sku.toLowerCase() === q.toLowerCase());
        if (v) return { product: p, variant: v };
      }
    }
    return null;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        memberships,
        logout,
        tenants,
        activeTenant,
        setActiveTenant,
        branches,
        activeBranch,
        setActiveBranch,
        userRole,
        userName,
        isSimulatedOffline,
        toggleSimulatedOffline,
        offlineQueueCount,
        syncOfflineSales,
        isSyncing,
        products,
        categories,
        ledger,
        sales,
        suppliers,
        purchaseOrders,
        auditLogs,
        reportsSummary,
        loading,
        refreshAllData,
        findProductByBarcode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
