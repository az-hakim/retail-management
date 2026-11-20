'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Save, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export function SettingsView() {
  const { activeTenant, branches, products, userRole, userName, refreshAllData } = useApp();

  const [currencySymbol, setCurrencySymbol] = useState(activeTenant?.settings.currency_symbol || '$');
  const [taxEnabled, setTaxEnabled] = useState(activeTenant?.settings.tax_config.enabled ?? true);
  const [taxInclusive, setTaxInclusive] = useState(activeTenant?.settings.tax_config.inclusive ?? false);
  const [taxRate, setTaxRate] = useState(activeTenant?.settings.tax_config.default_rate?.toString() || '7.5');
  const [taxLabel, setTaxLabel] = useState(activeTenant?.settings.tax_config.tax_id_label || 'VAT/GST');
  const [lowStockThreshold, setLowStockThreshold] = useState(
    activeTenant?.settings.low_stock_threshold_default?.toString() || '5'
  );
  const [receiptFooter, setReceiptFooter] = useState(
    activeTenant?.settings.receipt_footer_text || 'Thank you for shopping with us!'
  );
  const [allowNegativeStock, setAllowNegativeStock] = useState(
    activeTenant?.settings.allow_negative_stock ?? false
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!activeTenant) return null;

  // Plan limits according to agent.md Section 6
  const planLimits = {
    STARTER: { maxBranches: 1, maxSKUs: 1000, maxStaff: 3, batchTracking: false, apiAccess: false },
    GROWTH: { maxBranches: 5, maxSKUs: 15000, maxStaff: 15, batchTracking: true, apiAccess: false },
    ENTERPRISE: { maxBranches: 999, maxSKUs: 999999, maxStaff: 999, batchTracking: true, apiAccess: true },
  }[activeTenant.plan] || { maxBranches: 1, maxSKUs: 1000, maxStaff: 3, batchTracking: false, apiAccess: false };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/tenants', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': activeTenant.id,
          'X-User-Role': userRole,
          'X-User-Name': userName,
        },
        body: JSON.stringify({
          settings: {
            currency_symbol: currencySymbol,
            tax_config: {
              enabled: taxEnabled,
              inclusive: taxInclusive,
              default_rate: parseFloat(taxRate) || 0,
              tax_id_label: taxLabel,
            },
            low_stock_threshold_default: parseInt(lowStockThreshold, 10) || 5,
            receipt_footer_text: receiptFooter,
            allow_negative_stock: allowNegativeStock,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update settings');
      }

      await refreshAllData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating tenant settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-y-auto max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tenant Settings & Subscription Plan
        </h1>
        <p className="text-xs text-zinc-500">
          Configure financial rules, thermal receipt format & inspect SaaS subscription quota
        </p>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Tenant settings saved and updated across all active terminals!</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SaaS Subscription Quota Card */}
      <div className="rounded-2xl border border-purple-200 bg-linear-to-r from-purple-50/50 to-indigo-50/50 p-5 dark:border-purple-900/40 dark:from-purple-950/20 dark:to-indigo-950/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Subscription Tier: <span className="text-purple-600 dark:text-purple-400">{activeTenant.plan}</span>
              </h3>
              <p className="text-xs text-zinc-500">Enforced by SaaS middleware gateway</p>
            </div>
          </div>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
            Active Tenant
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white/80 p-3 dark:bg-zinc-900/80">
            <span className="text-zinc-500">Branches Quota</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {branches.length} / {planLimits.maxBranches === 999 ? 'Unlimited' : planLimits.maxBranches}
            </div>
          </div>
          <div className="rounded-xl bg-white/80 p-3 dark:bg-zinc-900/80">
            <span className="text-zinc-500">Active SKUs Quota</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {products.length} / {planLimits.maxSKUs.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-white/80 p-3 dark:bg-zinc-900/80">
            <span className="text-zinc-500">Batch & Expiry</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {planLimits.batchTracking ? 'Enabled (FEFO)' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Currency & Tax */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Currency & Tax Compliance
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Currency Symbol
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={currencySymbol}
                onChange={e => setCurrencySymbol(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Tax Identification Label
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={taxLabel}
                onChange={e => setTaxLabel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-bold text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  checked={taxEnabled}
                  onChange={e => setTaxEnabled(e.target.checked)}
                />
                <span>Enable Tax on POS</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  checked={taxInclusive}
                  onChange={e => setTaxInclusive(e.target.checked)}
                />
                <span>Prices Tax-Inclusive</span>
              </label>
            </div>
          </div>
        </div>

        {/* Inventory & POS Terminal Settings */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Inventory & POS Terminal Preferences
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Low Stock Warning Threshold (Default)
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(e.target.value)}
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  checked={allowNegativeStock}
                  onChange={e => setAllowNegativeStock(e.target.checked)}
                />
                <span>Allow Negative Stock on POS Checkout</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Thermal Receipt Policy Footer (Prints on 58mm & 80mm rolls)
            </label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              value={receiptFooter}
              onChange={e => setReceiptFooter(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Tenant Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
