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
import { UMLFlowView } from '@/components/uml/UMLFlowView';
import { useApp } from '@/context/AppContext';

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="skeleton h-8 w-8 rounded-lg" />
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-40 rounded-full" />
          <div className="skeleton h-2.5 w-28 rounded-full" />
        </div>
      </div>
      <div className="skeleton h-10 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Initializing OmniRetail terminal…</span>
    </div>
  );
}

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
        <main className="workspace-ambient relative flex flex-1 flex-col overflow-hidden pb-[72px] md:pb-0 bg-zinc-50/60 dark:bg-zinc-900/40">
          {loading ? (
            <WorkspaceSkeleton />
          ) : (
            <>
              {activeTab === 'pos' && <POSView />}
              {activeTab === 'catalog' && <CatalogView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'procurement' && <ProcurementView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'uml' && <UMLFlowView />}
              {activeTab === 'audit' && <AuditLogsView />}
              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
