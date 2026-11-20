'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';
import { ShieldAlert, KeyRound } from 'lucide-react';
import { AuditLog } from '@/types';

export function AuditLogsView() {
  const { activeTenant, auditLogs, userRole } = useApp();

  if (!activeTenant) return null;

  const isAuthorized = ['TENANT_OWNER', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(userRole);

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'MANUAL_PRICE_OVERRIDE':
        return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200';
      case 'HIGH_DISCOUNT_APPLIED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
      case 'STOCK_ADJUSTMENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
      case 'BRANCH_TRANSFER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200';
      case 'STOCK_RECEIVED_GRN':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-y-auto">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Compliance & Security Audit Trail
          </h1>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {activeTenant.name} • Immutable log of high-risk actions (price overrides, discounts &gt;10%, manual adjustments)
        </p>
      </div>

      {!isAuthorized ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <KeyRound className="h-8 w-8 mx-auto mb-2 text-red-600" />
          Access Denied. Current role ({userRole}) is not authorized to inspect security audit logs.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Security Action</th>
                  <th className="py-3 px-4">Authorized User</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4">New Value</th>
                  <th className="py-3 px-4 text-right">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 max-w-sm">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {log.old_value || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {log.new_value || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-zinc-400">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No security audit records found for this tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
