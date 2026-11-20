'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, Lock, Printer, CheckCircle2 } from 'lucide-react';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftCloseModal({ isOpen, onClose }: ShiftCloseModalProps) {
  const { activeTenant, activeBranch, userName, sales } = useApp();
  const [openingCash] = useState<number>(150);
  const [actualCashCounted, setActualCashCounted] = useState<string>('');
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [shiftStartTime] = useState<string>(() => new Date(Date.now() - 6 * 3600 * 1000).toISOString());

  if (!isOpen || !activeTenant || !activeBranch) return null;

  const symbol = activeTenant.settings.currency_symbol || '$';

  // Calculate totals for active branch
  const branchSales = sales.filter(s => s.branch_id === activeBranch.id);
  let totalCashSales = 0;
  let totalCardSales = 0;
  let totalMobileSales = 0;
  let totalDiscounts = 0;

  for (const s of branchSales) {
    totalDiscounts += s.discount_amount;
    for (const p of s.payments) {
      if (p.method === 'CASH') totalCashSales += p.amount;
      if (p.method === 'CARD') totalCardSales += p.amount;
      if (p.method === 'MOBILE') totalMobileSales += p.amount;
    }
  }

  const expectedCashInDrawer = openingCash + totalCashSales;
  const countedNum = parseFloat(actualCashCounted) || 0;
  const cashDiscrepancy = countedNum > 0 ? countedNum - expectedCashInDrawer : 0;

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Close Register & Shift (Z-Report)
              </h2>
              <p className="text-xs text-zinc-500">{activeBranch.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-zinc-50 p-3 text-xs space-y-1.5 dark:bg-zinc-800/50">
            <div className="flex justify-between">
              <span className="text-zinc-500">Cashier on Duty:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Terminal Code:</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">{activeBranch.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Shift Started:</span>
              <span>{formatDate(shiftStartTime)}</span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-xl border border-zinc-200 p-4 text-xs space-y-2 dark:border-zinc-800">
            <div className="flex justify-between font-medium">
              <span className="text-zinc-600 dark:text-zinc-400">Opening Float:</span>
              <span>{formatCurrency(openingCash, symbol)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-zinc-600 dark:text-zinc-400">Cash Sales:</span>
              <span>+{formatCurrency(totalCashSales, symbol)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-zinc-600 dark:text-zinc-400">Card / Terminal Sales:</span>
              <span>{formatCurrency(totalCardSales, symbol)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-zinc-600 dark:text-zinc-400">Mobile Wallet Sales:</span>
              <span>{formatCurrency(totalMobileSales, symbol)}</span>
            </div>
            <div className="flex justify-between font-medium text-amber-600 dark:text-amber-400">
              <span>Discounts Granted:</span>
              <span>-{formatCurrency(totalDiscounts, symbol)}</span>
            </div>
            <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
              <span>Expected Cash in Drawer:</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatCurrency(expectedCashInDrawer, symbol)}
              </span>
            </div>
          </div>

          {/* Cash Drawer Count */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Actual Cash Counted in Drawer ({symbol})
            </label>
            <input
              type="number"
              step="0.01"
              placeholder={expectedCashInDrawer.toFixed(2)}
              className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-bold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={actualCashCounted}
              onChange={e => setActualCashCounted(e.target.value)}
            />
            {actualCashCounted && (
              <p
                className={`mt-1 text-xs font-medium ${
                  cashDiscrepancy === 0
                    ? 'text-emerald-600'
                    : cashDiscrepancy > 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                }`}
              >
                Discrepancy:{' '}
                {cashDiscrepancy === 0
                  ? 'Balanced ($0.00)'
                  : `${cashDiscrepancy > 0 ? '+' : ''}${formatCurrency(cashDiscrepancy, symbol)}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={handlePrintZReport}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <Printer className="h-4 w-4" />
            <span>Print Z-Report</span>
          </button>
          <button
            onClick={() => {
              setIsClosed(true);
              setTimeout(() => {
                onClose();
              }, 1200);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isClosed ? 'Shift Closed!' : 'Finalize & Close Shift'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
