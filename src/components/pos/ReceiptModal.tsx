'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sale } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, X, RotateCcw } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onNewSale: () => void;
}

export function ReceiptModal({ isOpen, onClose, sale, onNewSale }: ReceiptModalProps) {
  const { activeTenant, activeBranch } = useApp();
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen || !sale || !activeTenant || !activeBranch) return null;

  const symbol = activeTenant.settings.currency_symbol || '$';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="flex flex-col items-center max-h-[95vh] w-full max-w-md">
        {/* Controls Toolbar */}
        <div className="mb-3 flex w-full items-center justify-between rounded-xl bg-white/90 p-2 shadow-lg backdrop-blur dark:bg-zinc-900/90 print:hidden">
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                paperWidth === '80mm'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              80mm Roll
            </button>
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                paperWidth === '58mm'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              58mm Roll
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div
          id="printable-thermal-receipt"
          className={`w-full overflow-hidden rounded-xl bg-white p-6 shadow-2xl font-mono text-zinc-950 border border-zinc-200 print:border-none print:shadow-none print:p-0 ${
            paperWidth === '58mm' ? 'max-w-[300px] text-[11px]' : 'max-w-[360px] text-xs'
          }`}
        >
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-zinc-400 pb-3">
            <h1 className="text-sm font-bold tracking-tight uppercase">{activeTenant.name}</h1>
            <p className="text-[10px] text-zinc-600">{activeBranch.name}</p>
            <p className="text-[10px] text-zinc-600">{activeBranch.address}</p>
            <p className="text-[10px] text-zinc-600">{activeBranch.phone}</p>
          </div>

          {/* Meta Info */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-bold">{sale.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(sale.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.cashier_name}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="py-2.5 border-b border-dashed border-zinc-400">
            <div className="flex justify-between font-bold border-b border-zinc-300 pb-1 mb-1">
              <span>Item Description</span>
              <span>Total</span>
            </div>
            <div className="space-y-1.5">
              {sale.items.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between font-semibold">
                    <span className="truncate pr-2">{item.product_name}</span>
                    <span>{formatCurrency(item.total_price, symbol)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>
                      {item.quantity} x {formatCurrency(item.unit_price, symbol)} ({item.sku})
                    </span>
                    {item.batch_number && <span>Batch: {item.batch_number}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Taxes Breakdown */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal, symbol)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-zinc-700">
                <span>Discount ({sale.discount_percent}%):</span>
                <span>-{formatCurrency(sale.discount_amount, symbol)}</span>
              </div>
            )}
            {activeTenant.settings.tax_config.enabled && (
              <div className="flex justify-between text-zinc-700">
                <span>
                  {activeTenant.settings.tax_config.tax_id_label} ({sale.tax_rate}%):
                </span>
                <span>{formatCurrency(sale.tax_amount, symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold border-t border-zinc-400 pt-1 mt-1">
              <span>TOTAL DUE:</span>
              <span>{formatCurrency(sale.total_amount, symbol)}</span>
            </div>
          </div>

          {/* Tender & Change */}
          <div className="py-2 border-b border-dashed border-zinc-400 text-[10px] space-y-0.5">
            {sale.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>Paid via {p.method}:</span>
                <span>{formatCurrency(p.amount, symbol)}</span>
              </div>
            ))}
            {sale.change_given > 0 && (
              <div className="flex justify-between font-bold text-zinc-900">
                <span>Change Given:</span>
                <span>{formatCurrency(sale.change_given, symbol)}</span>
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="py-3 text-center space-y-1">
            <div className="font-mono text-[9px] tracking-widest text-zinc-800">
              ||| | ||||| || |||| ||| |||| | ||| ||||
            </div>
            <div className="text-[9px] tracking-wider text-zinc-600">
              {sale.invoice_number}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[9px] text-zinc-500 pt-1 leading-tight">
            <p>{activeTenant.settings.receipt_footer_text}</p>
            <p className="mt-1 font-semibold">*** Thank You — Visit Again! ***</p>
          </div>
        </div>

        {/* Action Button for Next Customer */}
        <div className="mt-4 flex w-full gap-2 print:hidden">
          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-blue-700 transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>New Sale / Next Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
