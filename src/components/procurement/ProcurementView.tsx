'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { NewPOModal } from './NewPOModal';
import { ReceiveGRNModal } from './ReceiveGRNModal';
import { PurchaseOrder } from '@/types';
import {
  Truck,
  Plus,
  PackageCheck,
  Building2,
} from 'lucide-react';

export function ProcurementView() {
  const { activeTenant, suppliers, purchaseOrders, userRole } = useApp();

  const [isNewPOOpen, setIsNewPOOpen] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);

  if (!activeTenant) return null;
  const symbol = activeTenant.settings.currency_symbol || '$';

  const totalAP = suppliers.reduce((acc, s) => acc + s.balance_payable, 0);

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'PARTIAL_RECEIVED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
      case 'ORDERED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="flex-1 space-y-5 p-6 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Suppliers & Purchase Orders
          </h1>
          <p className="text-xs text-zinc-500">
            {activeTenant.name} • Vendor accounts payable & automated GRN intake
          </p>
        </div>

        {['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK', 'SUPER_ADMIN'].includes(userRole) && (
          <button
            onClick={() => setIsNewPOOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase Order</span>
          </button>
        )}
      </div>

      {/* Accounts Payable Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Accounts Payable</span>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalAP, symbol)}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Authorized Suppliers</span>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{suppliers.length} Vendors</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Active POs</span>
          <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{purchaseOrders.length} Orders</div>
        </div>
      </div>

      {/* Suppliers Directory */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>Authorized Suppliers Directory</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {suppliers.map(sup => (
            <div key={sup.id} className="rounded-xl border border-zinc-200 p-3 text-xs space-y-1.5 dark:border-zinc-800">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{sup.name}</h4>
              <p className="text-[11px] text-zinc-500">Contact: {sup.contact_name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{sup.email}</p>
              <div className="border-t border-zinc-100 pt-1.5 flex justify-between dark:border-zinc-800 font-semibold">
                <span className="text-zinc-500">Balance:</span>
                <span className="text-zinc-900 dark:text-zinc-100">{formatCurrency(sup.balance_payable, symbol)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600" />
            <span>Purchase Orders & Intake GRN</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Destination Branch</th>
                <th className="py-3 px-4">Items Count</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
              {purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {po.po_number}
                  </td>
                  <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">{formatDate(po.created_at)}</td>
                  <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">{po.supplier_name}</td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{po.branch_name}</td>
                  <td className="py-3 px-4">{po.items.length} line items</td>
                  <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(po.total_cost, symbol)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(po.status)}`}>
                      {po.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {po.status !== 'COMPLETED' ? (
                      <button
                        onClick={() => setSelectedPOForGRN(po)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>Receive GRN</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-zinc-400">All Received</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewPOModal isOpen={isNewPOOpen} onClose={() => setIsNewPOOpen(false)} />
      <ReceiveGRNModal
        isOpen={selectedPOForGRN !== null}
        onClose={() => setSelectedPOForGRN(null)}
        purchaseOrder={selectedPOForGRN}
      />
    </div>
  );
}
