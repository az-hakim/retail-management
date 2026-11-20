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
  Activity,
} from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'catalog'
  | 'inventory'
  | 'procurement'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'uml';

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
      shortLabel: 'POS',
      icon: ShoppingCart,
      roles: ['CASHIER', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
      badge: 'POS',
    },
    {
      id: 'catalog' as NavTab,
      label: 'Products & SKUs',
      shortLabel: 'Catalog',
      icon: Boxes,
      roles: ['INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory & Ledger',
      shortLabel: 'Stock',
      icon: ScrollText,
      roles: ['INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'procurement' as NavTab,
      label: 'Suppliers & POs',
      shortLabel: 'Supply',
      icon: Truck,
      roles: ['INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Analytics & Reports',
      shortLabel: 'Reports',
      icon: BarChart3,
      roles: ['BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
    },
    {
      id: 'uml' as NavTab,
      label: 'UML Flows & Architecture',
      shortLabel: 'Flows',
      icon: Activity,
      roles: ['CASHIER', 'INVENTORY_CLERK', 'BRANCH_MANAGER', 'TENANT_OWNER', 'SUPER_ADMIN'],
      badge: '2026',
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Logs',
      shortLabel: 'Audit',
      icon: ShieldAlert,
      roles: ['TENANT_OWNER', 'SUPER_ADMIN'],
      badge: 'RLS',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & Plan',
      shortLabel: 'Settings',
      icon: Settings,
      roles: ['TENANT_OWNER', 'SUPER_ADMIN'],
    },
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Desktop / tablet rail — icons only until lg, labels from lg up */}
      <aside className="hidden w-[72px] shrink-0 flex-col justify-between border-r border-zinc-200 bg-zinc-50/70 p-2.5 md:flex lg:w-64 lg:p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <nav className="space-y-1" aria-label="Primary">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                className={`group flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition lg:justify-between ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition ${
                      isActive
                        ? 'text-white'
                        : 'text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100'
                    }`}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </span>
                {item.badge && (
                  <span
                    className={`hidden rounded px-1.5 py-0.5 text-[10px] font-bold lg:inline ${
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

        {/* User profile & active scope widget */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-2 shadow-xs lg:p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div
              className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-700 lg:mx-0 dark:bg-zinc-800 dark:text-zinc-200"
              title={`${userName} · ${userRole.replace('_', ' ')}`}
            >
              {userName
                .split(' ')
                .map(n => n[0])
                .join('')}
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">{userName}</p>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{userRole.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {activeBranch && (
            <div className="mt-2.5 hidden border-t border-zinc-100 pt-2 text-[10px] text-zinc-500 lg:block dark:border-zinc-800 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Terminal: </span>
              <span className="truncate">{activeBranch.code}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 overflow-x-auto border-t border-zinc-200 bg-white/95 px-1.5 py-1.5 backdrop-blur-lg md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-14 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="truncate">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
