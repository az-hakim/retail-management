'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { X, Plus, Trash2 } from 'lucide-react';

interface NewPOModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewPOModal({ isOpen, onClose }: NewPOModalProps) {
  const { activeTenant, branches, suppliers, products, refreshAllData } = useApp();

  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [items, setItems] = useState<
    { product_id: string; quantity_ordered: number; unit_cost: number }[]
  >([
    {
      product_id: products[0]?.id || '',
      quantity_ordered: 20,
      unit_cost: products[0]?.cost_price || 10,
    },
  ]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activeTenant) return null;
  const symbol = activeTenant.settings.currency_symbol || '$';

  const addItemRow = () => {
    if (products.length === 0) return;
    setItems([
      ...items,
      {
        product_id: products[0].id,
        quantity_ordered: 10,
        unit_cost: products[0].cost_price,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalCost = items.reduce((acc, it) => acc + it.quantity_ordered * it.unit_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': activeTenant.id,
        },
        body: JSON.stringify({
          branch_id: branchId,
          supplier_id: supplierId,
          items,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create purchase order');
      }

      await refreshAllData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden my-8">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Create Purchase Order (PO)</h2>
            <p className="text-xs text-zinc-500">Replenish stock from authorized suppliers</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Destination Branch</label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Supplier</label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Ordered Products</label>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-zinc-200 p-2.5 text-xs dark:border-zinc-800">
                  <select
                    className="flex-1 rounded-lg border border-zinc-200 p-1.5 dark:border-zinc-700 dark:bg-zinc-800"
                    value={it.product_id}
                    onChange={e => {
                      const next = [...items];
                      const prod = products.find(p => p.id === e.target.value);
                      next[idx].product_id = e.target.value;
                      if (prod) next[idx].unit_cost = prod.cost_price;
                      setItems(next);
                    }}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    title="Qty"
                    placeholder="Qty"
                    className="w-16 rounded-lg border border-zinc-200 p-1.5 text-center dark:border-zinc-700 dark:bg-zinc-800"
                    value={it.quantity_ordered}
                    onChange={e => {
                      const next = [...items];
                      next[idx].quantity_ordered = parseInt(e.target.value, 10) || 1;
                      setItems(next);
                    }}
                  />

                  <input
                    type="number"
                    step="0.01"
                    title="Unit Cost"
                    placeholder="Cost"
                    className="w-20 rounded-lg border border-zinc-200 p-1.5 text-right dark:border-zinc-700 dark:bg-zinc-800"
                    value={it.unit_cost}
                    onChange={e => {
                      const next = [...items];
                      next[idx].unit_cost = parseFloat(e.target.value) || 0;
                      setItems(next);
                    }}
                  />

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center rounded-xl bg-zinc-50 p-3 text-xs font-bold dark:bg-zinc-800/50">
            <span>Estimated Total Cost:</span>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalCost, symbol)}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Notes / Terms</label>
            <input
              type="text"
              placeholder="e.g. Net-30 payment terms, dispatch by freight"
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
              <span>{isSubmitting ? 'Placing Order...' : 'Place Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
