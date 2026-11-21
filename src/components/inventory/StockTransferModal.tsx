'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StockTransferModal({ isOpen, onClose }: StockTransferModalProps) {
  const { activeTenant, branches, products, refreshAllData } = useApp();

  const [fromBranchId, setFromBranchId] = useState(branches[0]?.id || '');
  const [toBranchId, setToBranchId] = useState(branches[1]?.id || branches[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState('5');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activeTenant) return null;

  const currentProduct = products.find(p => p.id === selectedProductId);
  const sourceStock = currentProduct ? currentProduct.stock_by_branch[fromBranchId] || 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (fromBranchId === toBranchId) {
      setErrorMsg('Source and Destination branches must be different.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': activeTenant.id,
        },
        body: JSON.stringify({
          from_branch_id: fromBranchId,
          to_branch_id: toBranchId,
          product_id: selectedProductId,
          quantity: parseFloat(quantity),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      await refreshAllData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing stock transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Branch-to-Branch Stock Transfer</h2>
            <p className="text-xs text-zinc-500">Atomic inventory transfer with double ledger entry</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">From (Source)</label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={fromBranchId}
                onChange={e => setFromBranchId(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">To (Destination)</label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={toBranchId}
                onChange={e => setToBranchId(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Select Product</label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50 flex justify-between">
            <span className="text-zinc-500">Available Stock at Source:</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {sourceStock} {currentProduct?.unit_of_measure}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Transfer Quantity *</label>
            <input
              type="number"
              min="1"
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-bold text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Dispatch Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Courier Waybill #8841-A or van transfer"
              className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{isSubmitting ? 'Transferring...' : 'Execute Stock Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
