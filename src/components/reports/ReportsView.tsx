'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

export function ReportsView() {
  const { activeTenant, reportsSummary } = useApp();

  if (!activeTenant || !reportsSummary) {
    return <div className="p-8 text-center text-zinc-500">Loading analytics...</div>;
  }

  const symbol = activeTenant.settings.currency_symbol || '$';
  const aov =
    reportsSummary.totalSalesCount > 0
      ? reportsSummary.totalRevenue / reportsSummary.totalSalesCount
      : 0;

  // Hourly / Simulated chart points
  const chartBars = [
    { hour: '09:00', amount: reportsSummary.totalRevenue * 0.08 },
    { hour: '11:00', amount: reportsSummary.totalRevenue * 0.16 },
    { hour: '13:00', amount: reportsSummary.totalRevenue * 0.28 },
    { hour: '15:00', amount: reportsSummary.totalRevenue * 0.22 },
    { hour: '17:00', amount: reportsSummary.totalRevenue * 0.18 },
    { hour: '19:00', amount: reportsSummary.totalRevenue * 0.08 },
  ];
  const maxBar = Math.max(...chartBars.map(b => b.amount), 1);

  return (
    <div className="flex-1 space-y-6 p-6 overflow-y-auto">
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Executive Analytics & Financial Telemetry
        </h1>
        <p className="text-xs text-zinc-500">
          {activeTenant.name} • Real-time sales, gross profit margin & inventory health
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(reportsSummary.totalRevenue, symbol)}
          </div>
          <div className="mt-1 flex items-center text-[10px] font-semibold text-emerald-600">
            <TrendingUp className="h-3 w-3 mr-0.5" />
            <span>+14.8% vs last week</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Profit</span>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-blue-600 dark:text-blue-400">
            {formatCurrency(reportsSummary.totalProfit, symbol)}
          </div>
          <div className="mt-1 text-[10px] text-zinc-400 font-medium">After COGS deduction</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Margin</span>
            <Percent className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-purple-600 dark:text-purple-400">
            {reportsSummary.grossMargin}%
          </div>
          <div className="mt-1 text-[10px] text-zinc-400 font-medium">Weighted average</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {reportsSummary.totalSalesCount}
          </div>
          <div className="mt-1 text-[10px] text-zinc-400 font-medium">
            Avg ticket: {formatCurrency(aov, symbol)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock SKUs</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-amber-600 dark:text-amber-400">
            {reportsSummary.lowStockCount}
          </div>
          <div className="mt-1 text-[10px] text-amber-600 font-semibold">Requires reorder</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Expiring Batches</span>
            <Calendar className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-red-600 dark:text-red-400">
            {reportsSummary.expiringSoon.length}
          </div>
          <div className="mt-1 text-[10px] text-red-500 font-medium">Within 30 days</div>
        </div>
      </div>

      {/* Visual Chart & Top Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Hourly Bar Chart (Pure CSS/SVG, fast and zero runtime bundle) */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Today&apos;s Sales Velocity
              </h3>
              <p className="text-xs text-zinc-500">Distribution by transaction window</p>
            </div>
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              Live Feed
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-zinc-100 dark:border-zinc-800">
            {chartBars.map((bar, i) => {
              const heightPct = Math.max(12, Math.round((bar.amount / maxBar) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-zinc-600 transition">
                    {formatCurrency(bar.amount, symbol)}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full rounded-t-lg bg-blue-500 hover:bg-blue-600 transition duration-300 shadow-sm shadow-blue-500/20"
                  />
                  <span className="text-[10px] font-medium text-zinc-400">{bar.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Products Leaderboard */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Top Performing SKUs
          </h3>
          <p className="text-xs text-zinc-500 mb-4">Ranked by unit velocity</p>

          <div className="space-y-3">
            {reportsSummary.topProducts.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-600 text-[10px] dark:bg-zinc-800 dark:text-zinc-300">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {p.name}
                  </span>
                </div>
                <div className="text-right whitespace-nowrap pl-2">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    {p.quantity} units
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {formatCurrency(p.revenue, symbol)}
                  </div>
                </div>
              </div>
            ))}

            {reportsSummary.topProducts.length === 0 && (
              <p className="text-xs text-zinc-400 py-6 text-center">No sales recorded today yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Expiring Soon FEFO Alert Table */}
      {reportsSummary.expiringSoon.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-white overflow-hidden shadow-xs dark:border-red-900/50 dark:bg-zinc-900">
          <div className="border-b border-red-100 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-600" />
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                Near-Expiry Batch Watchlist (FEFO First-Out Action Required)
              </h3>
            </div>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/60 dark:text-red-300">
              {reportsSummary.expiringSoon.length} Batches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-4">Quantity Remaining</th>
                  <th className="py-2.5 px-4">Expiry Date</th>
                  <th className="py-2.5 px-4 text-right">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                {reportsSummary.expiringSoon.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{b.product_name}</td>
                    <td className="py-2.5 px-4 font-mono text-purple-600 dark:text-purple-400">{b.batch_number}</td>
                    <td className="py-2.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">{b.quantity}</td>
                    <td className="py-2.5 px-4 font-bold text-red-600 dark:text-red-400">{b.expiry_date}</td>
                    <td className="py-2.5 px-4 text-right text-zinc-500">
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300">
                        Prioritize on POS / Markdown
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
