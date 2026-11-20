'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { POSView } from '@/components/pos/POSView';
import { CatalogView } from '@/components/catalog/CatalogView';
import { InventoryView } from '@/components/inventory/InventoryView';
import { ProcurementView } from '@/components/procurement/ProcurementView';
import { ReportsView } from '@/components/reports/ReportsView';
import { AuditLogsView } from '@/components/audit/AuditLogsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const { loading } = useApp();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Top Header */}
      <Navbar />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab View Container */}
        <main className="flex flex-1 flex-col overflow-hidden bg-zinc-50/60 dark:bg-zinc-900/40">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="text-xs font-semibold text-zinc-500">Initializing OmniRetail terminal...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'pos' && <POSView />}
              {activeTab === 'catalog' && <CatalogView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'procurement' && <ProcurementView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'audit' && <AuditLogsView />}
              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
