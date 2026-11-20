'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, generateUUIDv7 } from '@/lib/utils';
import { offlineSync } from '@/lib/offline-sync';
import { PaymentMethod, PaymentEntry, Sale } from '@/types';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';

interface CartItem {
  product: any;
  variant?: any;
  quantity: number;
  unit_price: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  onSaleComplete: (sale: Sale) => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  subtotal,
  discountPercent,
  discountAmount,
  taxRate,
  taxAmount,
  totalAmount,
  onSaleComplete,
}: CheckoutModalProps) {
  const { activeTenant, activeBranch, userRole, userName, isSimulatedOffline, refreshAllData } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>(totalAmount.toFixed(2));
  const [cardAuthCode, setCardAuthCode] = useState<string>('');
  const [mobileRef, setMobileRef] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activeTenant || !activeBranch) return null;

  const symbol = activeTenant.settings.currency_symbol || '$';
  const cashNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashNum - totalAmount);

  // Quick cash bill presets
  const quickBills = [
    { label: 'Exact', amount: totalAmount },
    { label: `${symbol}10`, amount: 10 },
    { label: `${symbol}20`, amount: 20 },
    { label: `${symbol}50`, amount: 50 },
    { label: `${symbol}100`, amount: 100 },
  ].filter(b => b.amount >= totalAmount || b.label === 'Exact');

  const handleSubmit = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const idempotencyKey = generateUUIDv7();

      const payments: PaymentEntry[] = [];
      if (paymentMethod === 'CASH') {
        if (cashNum < totalAmount) {
          throw new Error(`Tendered cash (${symbol}${cashNum.toFixed(2)}) is less than total due (${symbol}${totalAmount.toFixed(2)})`);
        }
        payments.push({ method: 'CASH', amount: totalAmount });
      } else if (paymentMethod === 'CARD') {
        payments.push({ method: 'CARD', amount: totalAmount, reference: cardAuthCode || 'VISA-AUTH-DEMO' });
      } else if (paymentMethod === 'MOBILE') {
        payments.push({ method: 'MOBILE', amount: totalAmount, reference: mobileRef || 'MFS-TXN-DEMO' });
      } else {
        payments.push({ method: 'CREDIT', amount: totalAmount });
      }

      const checkoutPayload = {
        branch_id: activeBranch.id,
        cashier: { id: 'usr-current', name: userName, role: userRole },
        customer: { name: customerName, phone: customerPhone },
        items: cart.map(item => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        payments,
      };

      // Check if simulated offline or network drop
      if (isSimulatedOffline || !navigator.onLine) {
        // Enqueue offline transaction locally
        offlineSync.enqueueSale(activeTenant.id, activeBranch.id, idempotencyKey, checkoutPayload);

        // Generate synthetic offline sale for thermal receipt preview
        const offlineSale: Sale = {
          id: `offline-${Date.now()}`,
          tenant_id: activeTenant.id,
          branch_id: activeBranch.id,
          invoice_number: `INV-OFFLINE-${Date.now().toString().slice(-4)}`,
          idempotency_key: idempotencyKey,
          cashier_id: 'usr-current',
          cashier_name: userName,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: cart.map(item => ({
            id: generateUUIDv7(),
            product_id: item.product.id,
            product_name: item.product.name,
            sku: item.variant?.sku || item.product.sku,
            barcode: item.variant?.barcode || item.product.barcode,
            unit_price: item.unit_price,
            cost_price: item.product.cost_price,
            quantity: item.quantity,
            total_price: item.unit_price * item.quantity,
          })),
          subtotal,
          discount_amount: discountAmount,
          discount_percent: discountPercent,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payments,
          change_given: changeDue,
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
        };

        onSaleComplete(offlineSale);
        return;
      }

      // Online checkout via API
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': activeTenant.id,
          'X-Idempotency-Key': idempotencyKey,
          'X-User-Role': userRole,
          'X-User-Name': userName,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Checkout failed');
      }

      await refreshAllData();
      onSaleComplete(data.sale);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Tender Payment</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {activeTenant.name} • {activeBranch.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Offline notification banner if offline */}
        {isSimulatedOffline && (
          <div className="flex items-center gap-2 bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Offline Mode Active — Sale will be queued securely in IndexedDB with an idempotency key.
            </span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Amount Due Big Display */}
          <div className="rounded-xl bg-zinc-100 p-4 text-center dark:bg-zinc-800/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Amount Due
            </span>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAmount, symbol)}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span>{cart.length} line items</span>
              {discountAmount > 0 && <span>• Discount: {formatCurrency(discountAmount, symbol)}</span>}
              {taxAmount > 0 && <span>• Tax: {formatCurrency(taxAmount, symbol)}</span>}
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Select Payment Method</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                  paymentMethod === 'CASH'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                  paymentMethod === 'CARD'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Credit/Debit</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('MOBILE')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                  paymentMethod === 'MOBILE'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <Smartphone className="h-5 w-5" />
                <span>Mobile Wallet</span>
              </button>
            </div>
          </div>

          {/* Cash Details & Change Calculator */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Cash Tendered ({symbol})
                </label>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Change: {formatCurrency(changeDue, symbol)}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-lg font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                value={cashTendered}
                onChange={e => setCashTendered(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {quickBills.map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCashTendered(b.amount.toFixed(2))}
                    className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card Reference */}
          {paymentMethod === 'CARD' && (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Card Approval / Terminal Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. AUTH-VISA-8821"
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-xs font-mono dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                value={cardAuthCode}
                onChange={e => setCardAuthCode(e.target.value)}
              />
            </div>
          )}

          {/* Mobile Wallet Reference */}
          {paymentMethod === 'MOBILE' && (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Mobile Wallet Txn ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-MFS-9842"
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-xs font-mono dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                value={mobileRef}
                onChange={e => setMobileRef(e.target.value)}
              />
            </div>
          )}

          {/* Customer Info (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Walk-in Customer"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Processing...' : `Confirm & Charge ${formatCurrency(totalAmount, symbol)}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
