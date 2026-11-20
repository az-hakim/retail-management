'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Tenant, Branch, UserRole, Product, Category, StockLedgerEntry, Sale, Supplier, PurchaseOrder, AuditLog } from '@/types';
import { offlineSync } from '@/lib/offline-sync';

interface AppContextType {
  tenants: Tenant[];
  activeTenant: Tenant | null;
  setActiveTenant: (t: Tenant) => void;
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (b: Branch) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('TENANT_OWNER');
  const [userName] = useState<string>('Alex Wright');

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

  // Load tenants on mount
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/tenants');
        const data = await res.json();
        if (data.tenants && data.tenants.length > 0) {
          setTenants(data.tenants);
          setActiveTenantState(data.tenants[0]);
        }
      } catch (err) {
        console.error('Failed to load initial tenants:', err);
      }
    }
    loadInitial();
  }, []);

  // When active tenant changes, fetch branches & data
  const refreshAllData = useCallback(async () => {
    if (!activeTenant) return;
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'x-tenant-id': activeTenant.id,
        'x-user-role': userRole,
        'x-user-name': userName,
      };

      // 1. Branches
      const resB = await fetch('/api/branches', { headers });
      const dataB = await resB.json();
      if (dataB.branches) {
        setBranches(dataB.branches);
        if (!activeBranch || !dataB.branches.some((b: Branch) => b.id === activeBranch.id)) {
          setActiveBranchState(dataB.branches[0] || null);
        }
      }

      // 2. Products & Categories
      const resP = await fetch('/api/products', { headers });
      const dataP = await resP.json();
      if (dataP.products) setProducts(dataP.products);
      if (dataP.categories) setCategories(dataP.categories);

      // 3. Sales
      const resS = await fetch('/api/pos/checkout', { headers });
      const dataS = await resS.json();
      if (dataS.sales) setSales(dataS.sales);

      // 4. Ledger
      const resL = await fetch('/api/inventory/ledger', { headers });
      const dataL = await resL.json();
      if (dataL.entries) setLedger(dataL.entries);

      // 5. Purchase Orders
      const resPO = await fetch('/api/purchase-orders', { headers });
      const dataPO = await resPO.json();
      if (dataPO.purchaseOrders) setPurchaseOrders(dataPO.purchaseOrders);
      if (dataPO.suppliers) setSuppliers(dataPO.suppliers);

      // 6. Reports Summary
      const resR = await fetch('/api/reports', { headers });
      const dataR = await resR.json();
      if (dataR.summary) setReportsSummary(dataR.summary);

      // 7. Audit logs (if allowed)
      if (['TENANT_OWNER', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
        const resA = await fetch('/api/audit-logs', { headers });
        const dataA = await resA.json();
        if (dataA.logs) setAuditLogs(dataA.logs);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTenant, activeBranch, userRole, userName]);

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
        tenants,
        activeTenant,
        setActiveTenant,
        branches,
        activeBranch,
        setActiveBranch,
        userRole,
        setUserRole,
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
