'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShoppingCart,
  Boxes,
  ScrollText,
  Truck,
  BarChart3,
  ShieldAlert,
  Settings,
  UserCheck,
} from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'catalog'
  | 'inventory'
  | 'procurement'
  | 'reports'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { userRole, userName, activeBranch } = useApp();

  const navItems = [
    {
      id: 'pos' as NavTab,
      label: 'Point of Sale',
      icon: ShoppingCart,
      roles: ['CASHIER', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
      badge: 'POS',
    },
    {
      id: 'catalog' as NavTab,
      label: 'Products & SKUs',
      icon: Boxes,
      roles: ['INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory & Ledger',
      icon: ScrollText,
      roles: ['INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'procurement' as NavTab,
      label: 'Suppliers & POs',
      icon: Truck,
      roles: ['INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Analytics & Reports',
      icon: BarChart3,
      roles: ['BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Logs',
      icon: ShieldAlert,
      roles: ['TENANT_OWNER', 'SUPER_ADMIN'],
      badge: 'RLS',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & Plan',
      icon: Settings,
      roles: ['TENANT_OWNER', 'SUPER_ADMIN'],
    },
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="flex w-64 flex-col justify-between border-r border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="space-y-4">
        {/* Navigation list */}
        <nav className="space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition ${
                      isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & active scope widget */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 text-xs">
            {userName
              .split(' ')
              .map(n => n[0])
              .join('')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">{userName}</p>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">{userRole.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {activeBranch && (
          <div className="mt-2.5 border-t border-zinc-100 pt-2 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Terminal: </span>
            <span className="truncate">{activeBranch.code}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
