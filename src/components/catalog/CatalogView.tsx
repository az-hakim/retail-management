'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { ProductModal } from './ProductModal';
import {
  Plus,
  Search,
  Calendar,
  Barcode,
} from 'lucide-react';

export function CatalogView() {
  const { activeTenant, activeBranch, products, categories, userRole } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!activeTenant) return null;
  const symbol = activeTenant.settings.currency_symbol || '$';

  const filtered = products.filter(p => {
    if (selectedCat !== 'ALL' && p.category_id !== selectedCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    }
    return true;
  });

  const totalSKUs = products.length;
  const lowStockCount = products.filter(p => {
    const stock = activeBranch ? p.stock_by_branch[activeBranch.id] || 0 : 0;
    return stock <= (p.reorder_level || 5);
  }).length;

  return (
    <div className="flex-1 space-y-5 p-6 overflow-y-auto">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Catalog & SKU Management
          </h1>
          <p className="text-xs text-zinc-500">
            {activeTenant.name} • {totalSKUs} Active SKUs in catalog
          </p>
        </div>

        {['TENANT_OWNER', 'BRANCH_MANAGER', 'INVENTORY_CLERK', 'SUPER_ADMIN'].includes(userRole) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Catalog SKUs</span>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{totalSKUs}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Categories</span>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{categories.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Low Stock Warnings</span>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{lowStockCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Batch & FEFO Active</span>
          <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
            {products.filter(p => p.track_batch_expiry).length} items
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Catalog Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Cost Price</th>
                <th className="py-3 px-4">Retail Price</th>
                <th className="py-3 px-4">Gross Margin</th>
                <th className="py-3 px-4">Stock on Hand</th>
                <th className="py-3 px-4">Batches / Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
              {filtered.map(product => {
                const branchStock = activeBranch ? product.stock_by_branch[activeBranch.id] || 0 : 0;
                const margin =
                  product.retail_price > 0
                    ? (((product.retail_price - product.cost_price) / product.retail_price) * 100).toFixed(1)
                    : '0';

                return (
                  <tr key={product.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</div>
                      <div className="font-mono text-[10px] text-zinc-400">{product.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        <Barcode className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{product.barcode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {product.category_name || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{formatCurrency(product.cost_price, symbol)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(product.retail_price, symbol)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{margin}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          branchStock <= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : branchStock <= product.reorder_level
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {branchStock} {product.unit_of_measure}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {product.track_batch_expiry && product.batches && product.batches.length > 0 ? (
                        <div className="space-y-0.5">
                          {product.batches.map(b => (
                            <div key={b.id} className="flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300">
                              <Calendar className="h-3 w-3" />
                              <span>{b.batch_number} (Exp: {b.expiry_date})</span>
                            </div>
                          ))}
                        </div>
                      ) : product.track_batch_expiry ? (
                        <span className="text-[10px] text-zinc-400">Batch tracking on (empty)</span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
