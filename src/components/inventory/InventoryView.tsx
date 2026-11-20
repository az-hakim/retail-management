'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockTransferModal } from './StockTransferModal';
import { StockMovementType } from '@/types';
import {
  Boxes,
  ScrollText,
  SlidersHorizontal,
  ArrowRightLeft,
  Search,
} from 'lucide-react';

export function InventoryView() {
  const { activeTenant, branches, products, ledger, userRole } = useApp();

  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [search, setSearch] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<string>('ALL');
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  if (!activeTenant) return null;
  const symbol = activeTenant.settings.currency_symbol || '$';

  const filteredProducts = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const filteredLedger = ledger.filter(entry => {
    if (selectedMovement !== 'ALL' && entry.movement_type !== selectedMovement) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (entry.product_name && entry.product_name.toLowerCase().includes(q)) ||
      entry.sku.toLowerCase().includes(q) ||
      entry.reference_id.toLowerCase().includes(q)
    );
  });

  const movementBadge = (type: StockMovementType) => {
    switch (type) {
      case 'PURCHASE_IN':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'SALE_OUT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
      case 'ADJUSTMENT':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
      case 'DAMAGE_OUT':
        return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="flex-1 space-y-5 p-6 overflow-y-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-zinc-500">
            {activeTenant.name} • Immutable double-entry stock journal
          </p>
        </div>

        {['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK', 'SUPER_ADMIN'].includes(userRole) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdjustOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Adjust Stock</span>
            </button>
            {branches.length > 1 && (
              <button
                onClick={() => setIsTransferOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Branch Transfer</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'stock'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Branch Stock Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <ScrollText className="h-4 w-4" />
          <span>Immutable Ledger ({ledger.length})</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'stock'
                ? 'Search stock by product name or SKU...'
                : 'Search ledger by SKU, product name, or reference ID...'
            }
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {activeTab === 'ledger' && (
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            value={selectedMovement}
            onChange={e => setSelectedMovement(e.target.value)}
          >
            <option value="ALL">All Movements</option>
            <option value="PURCHASE_IN">Purchase In</option>
            <option value="SALE_OUT">Sale Out</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="RETURN_IN">Return In</option>
          </select>
        )}
      </div>

      {/* TAB 1: Stock Matrix Table */}
      {activeTab === 'stock' && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Unit</th>
                  {branches.map(b => (
                    <th key={b.id} className="py-3 px-4 text-center">
                      {b.name}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">Total Stock</th>
                  <th className="py-3 px-4 text-right">Inventory Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                {filteredProducts.map(product => {
                  const totalStock = branches.reduce(
                    (acc, b) => acc + (product.stock_by_branch[b.id] || 0),
                    0
                  );
                  const valuation = totalStock * product.cost_price;

                  return (
                    <tr key={product.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{product.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{product.unit_of_measure}</td>
                      {branches.map(b => {
                        const bStock = product.stock_by_branch[b.id] || 0;
                        return (
                          <td key={b.id} className="py-3 px-4 text-center">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                bStock <= 0
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                  : bStock <= product.reorder_level
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {bStock}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">
                        {totalStock} {product.unit_of_measure}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(valuation, symbol)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Immutable Stock Ledger Table */}
      {activeTab === 'ledger' && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                <tr>
                  <th className="py-3 px-4">Date / Time (UTC)</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Quantity Delta</th>
                  <th className="py-3 px-4 text-center">Balance After</th>
                  <th className="py-3 px-4">Snapshot Cost</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                {filteredLedger.map(entry => (
                  <tr key={entry.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {entry.branch_name || entry.branch_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{entry.product_name}</div>
                      <div className="font-mono text-[10px] text-zinc-400">{entry.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${movementBadge(entry.movement_type)}`}>
                        {entry.movement_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          entry.quantity_delta > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entry.quantity_delta > 0 ? '+' : ''}
                        {entry.quantity_delta}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {entry.balance_after}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(entry.cost_price_at_time, symbol)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {entry.reference_id}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{entry.created_by_user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StockAdjustmentModal isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} />
      <StockTransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
    </div>
  );
}
