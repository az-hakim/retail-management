'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Plus, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal({ isOpen, onClose }: ProductModalProps) {
  const { activeTenant, categories, branches, userRole, userName, refreshAllData } = useApp();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [unitOfMeasure, setUnitOfMeasure] = useState<'pcs' | 'kg' | 'liter' | 'box' | 'meter'>('pcs');
  const [costPrice, setCostPrice] = useState('10.00');
  const [retailPrice, setRetailPrice] = useState('19.99');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [trackBatchExpiry, setTrackBatchExpiry] = useState(false);
  const [initialStocks, setInitialStocks] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activeTenant) return null;

  const symbol = activeTenant.settings.currency_symbol || '$';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': activeTenant.id,
          'X-User-Role': userRole,
          'X-User-Name': userName,
        },
        body: JSON.stringify({
          sku,
          barcode,
          name,
          category_id: categoryId,
          unit_of_measure: unitOfMeasure,
          cost_price: parseFloat(costPrice),
          retail_price: parseFloat(retailPrice),
          reorder_level: parseInt(reorderLevel, 10),
          has_variants: false,
          track_batch_expiry: trackBatchExpiry,
          initial_stock: initialStocks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create product');
      }

      await refreshAllData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden my-8">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Create New Catalog Product</h2>
            <p className="text-xs text-zinc-500">{activeTenant.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Product Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Ergonomic Keyboard"
              className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">SKU (Unique) *</label>
              <input
                type="text"
                required
                placeholder="e.g. APX-KEY-WRLS-01"
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-mono font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Barcode (EAN-13/UPC) *</label>
              <input
                type="text"
                required
                placeholder="e.g. 8901234567999"
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-mono font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Category</label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Unit of Measure</label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={unitOfMeasure}
                onChange={e => setUnitOfMeasure(e.target.value as any)}
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="liter">Liter (L)</option>
                <option value="box">Box (box)</option>
                <option value="meter">Meter (m)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Cost Price ({symbol}) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Retail Price ({symbol}) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-bold text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
                value={retailPrice}
                onChange={e => setRetailPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Reorder Threshold</label>
              <input
                type="number"
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={reorderLevel}
                onChange={e => setReorderLevel(e.target.value)}
              />
            </div>
          </div>

          {/* Batch & Expiry tracking toggle */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/40">
            <input
              type="checkbox"
              id="trackBatch"
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
              checked={trackBatchExpiry}
              onChange={e => setTrackBatchExpiry(e.target.checked)}
            />
            <label htmlFor="trackBatch" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              Enable Batch Number & Expiration Date Tracking (FEFO deduction)
            </label>
          </div>

          {/* Initial stock per branch */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Initial Stock Allocation (Appends to Stock Ledger)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {branches.map(b => (
                <div key={b.id} className="rounded-xl border border-zinc-200 p-2 text-xs dark:border-zinc-800">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">{b.name}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-zinc-200 p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    value={initialStocks[b.id] || ''}
                    onChange={e =>
                      setInitialStocks({
                        ...initialStocks,
                        [b.id]: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
