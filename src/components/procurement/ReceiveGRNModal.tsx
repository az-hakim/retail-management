'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PurchaseOrder } from '@/types';
import { X, CheckCircle2 } from 'lucide-react';

interface ReceiveGRNModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
}

export function ReceiveGRNModal({ isOpen, onClose, purchaseOrder }: ReceiveGRNModalProps) {
  const { activeTenant, userRole, userName, refreshAllData } = useApp();

  const [receivedMap, setReceivedMap] = useState<
    Record<string, { qty: number; batch?: string; expiry?: string }>
  >(() => {
    const init: Record<string, { qty: number; batch?: string; expiry?: string }> = {};
    if (purchaseOrder) {
      for (const it of purchaseOrder.items) {
        init[it.product_id] = {
          qty: Math.max(0, it.quantity_ordered - it.quantity_received),
          batch: `BATCH-${Date.now().toString().slice(-4)}`,
          expiry: '2027-12-31',
        };
      }
    }
    return init;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !purchaseOrder || !activeTenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const receivedItems = Object.entries(receivedMap).map(([productId, val]) => ({
        product_id: productId,
        quantity_received: val.qty,
        batch_number: val.batch,
        expiry_date: val.expiry,
      }));

      const res = await fetch('/api/purchase-orders/receive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': activeTenant.id,
          'X-User-Role': userRole,
          'X-User-Name': userName,
        },
        body: JSON.stringify({
          po_id: purchaseOrder.id,
          received_items: receivedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process GRN');
      }

      await refreshAllData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing GRN');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden my-8">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Goods Received Note (GRN)
            </h2>
            <p className="text-xs text-zinc-500">
              PO: {purchaseOrder.po_number} • Supplier: {purchaseOrder.supplier_name}
            </p>
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

          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Confirming stock receipt immediately updates warehouse stock and generates immutable{' '}
            <span className="font-bold text-emerald-600">PURCHASE_IN</span> ledger entries.
          </p>

          <div className="space-y-3">
            {purchaseOrder.items.map(item => {
              const current = receivedMap[item.product_id] || { qty: 0 };
              const pending = item.quantity_ordered - item.quantity_received;

              return (
                <div key={item.product_id} className="rounded-xl border border-zinc-200 p-3 text-xs space-y-2 dark:border-zinc-800">
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-900 dark:text-zinc-100">{item.product_name}</span>
                    <span className="text-zinc-500">
                      Ordered: {item.quantity_ordered} (Received: {item.quantity_received})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500">Qty to Receive</label>
                      <input
                        type="number"
                        min="0"
                        max={pending}
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 p-1.5 text-xs font-bold text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
                        value={current.qty}
                        onChange={e =>
                          setReceivedMap({
                            ...receivedMap,
                            [item.product_id]: {
                              ...current,
                              qty: parseInt(e.target.value, 10) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500">Batch # (Optional)</label>
                      <input
                        type="text"
                        placeholder="BN-2026-X"
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                        value={current.batch || ''}
                        onChange={e =>
                          setReceivedMap({
                            ...receivedMap,
                            [item.product_id]: {
                              ...current,
                              batch: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500">Expiry Date</label>
                      <input
                        type="date"
                        className="mt-0.5 w-full rounded-lg border border-zinc-200 p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                        value={current.expiry || ''}
                        onChange={e =>
                          setReceivedMap({
                            ...receivedMap,
                            [item.product_id]: {
                              ...current,
                              expiry: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
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
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Processing GRN...' : 'Post GRN & Update Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
