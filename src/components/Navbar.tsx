'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import {
  Store,
  MapPin,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const {
    tenants,
    activeTenant,
    setActiveTenant,
    branches,
    activeBranch,
    setActiveBranch,
    userRole,
    setUserRole,
    isSimulatedOffline,
    toggleSimulatedOffline,
    offlineQueueCount,
    syncOfflineSales,
    isSyncing,
    reportsSummary,
  } = useApp();

  const lowStockCount = reportsSummary?.lowStockCount || 0;
  const expiringCount = reportsSummary?.expiringSoon?.length || 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6">
      {/* Brand & Multi-Tenant Switcher */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Store className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              <span>OmniRetail</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Multi-Tenant POS & Cloud ERP
            </p>
          </div>
        </div>

        {/* Tenant Switcher dropdown */}
        <div className="relative">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Active Tenant
          </label>
          <div className="flex items-center gap-2">
            <select
              aria-label="Active Tenant"
              className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={activeTenant?.id || ''}
              onChange={e => {
                const found = tenants.find(t => t.id === e.target.value);
                if (found) setActiveTenant(found);
              }}
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan})
                </option>
              ))}
            </select>
            {activeTenant?.plan && (
              <span className="hidden items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 md:inline-flex">
                <Sparkles className="h-2.5 w-2.5" />
                {activeTenant.plan}
              </span>
            )}
          </div>
        </div>

        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="hidden lg:block">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Branch Outlet
            </label>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
              <select
                aria-label="Branch Outlet"
                className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                value={activeBranch?.id || ''}
                onChange={e => {
                  const b = branches.find(item => item.id === e.target.value);
                  if (b) setActiveBranch(b);
                }}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_main ? '★ (Main)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Right side controls: Role Simulator, Offline Simulator, Alerts */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Alerts Badge */}
        {(lowStockCount > 0 || expiringCount > 0) && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
            <Bell className="h-3.5 w-3.5 animate-bounce text-amber-600 dark:text-amber-400" />
            <span>
              {lowStockCount > 0 ? `${lowStockCount} low stock` : ''}
              {lowStockCount > 0 && expiringCount > 0 ? ' • ' : ''}
              {expiringCount > 0 ? `${expiringCount} expiring soon` : ''}
            </span>
          </div>
        )}

        {/* Offline Simulator Switch & Sync Button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSimulatedOffline}
            title="Click to toggle offline mode simulation for testing"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
              isSimulatedOffline
                ? 'border-amber-300 bg-amber-100 text-amber-900 animate-pulse dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>OFFLINE MODE</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">ONLINE</span>
              </>
            )}
          </button>

          {offlineQueueCount > 0 && (
            <button
              onClick={syncOfflineSales}
              disabled={isSyncing || isSimulatedOffline}
              title={
                isSimulatedOffline
                  ? 'Switch to ONLINE mode to sync queued transactions'
                  : 'Sync queued offline transactions now'
              }
              className={`flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300 ${
                isSimulatedOffline ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                Sync ({offlineQueueCount})
              </span>
            </button>
          )}
        </div>

        {/* RBAC Role Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <Shield className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400 ml-1" />
          <select
            aria-label="Simulate Role"
            className="bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none dark:text-zinc-200 cursor-pointer"
            value={userRole}
            onChange={e => setUserRole(e.target.value as UserRole)}
          >
            <option value="TENANT_OWNER">Owner</option>
            <option value="BRANCH_MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="INVENTORY_CLERK">Inventory Clerk</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>
    </header>
  );
}
