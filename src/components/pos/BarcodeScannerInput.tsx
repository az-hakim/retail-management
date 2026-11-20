'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { playScanBeep } from '@/lib/utils';
import { Barcode, Scan, Sparkles } from 'lucide-react';

interface BarcodeScannerInputProps {
  onScanSuccess: (item: { product: any; variant?: any }) => void;
  onScanError?: (barcode: string) => void;
}

export function BarcodeScannerInput({ onScanSuccess, onScanError }: BarcodeScannerInputProps) {
  const { findProductByBarcode, products } = useApp();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input for instant hardware scanner readiness
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = (codeToScan?: string) => {
    const code = (codeToScan || barcodeInput).trim();
    if (!code) return;

    const result = findProductByBarcode(code);
    if (result) {
      playScanBeep(true);
      setLastScanned(result.product.name);
      onScanSuccess(result);
      setBarcodeInput('');
    } else {
      playScanBeep(false);
      if (onScanError) onScanError(code);
      setLastScanned(`Not found: "${code}"`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  // Sample quick barcodes for rapid testing
  const sampleBarcodes = products.slice(0, 3).map(p => ({
    name: p.name,
    barcode: p.barcode,
    sku: p.sku,
  }));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 dark:text-zinc-400">
            <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-24 text-sm font-mono font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900"
            placeholder="Scan barcode with scanner or type SKU & press Enter..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={() => handleScan()}
            className="absolute inset-y-1 right-1 flex items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Barcode className="h-3.5 w-3.5" />
            <span>Scan</span>
          </button>
        </div>

        {/* Quick barcode simulation buttons for testing */}
        {sampleBarcodes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
              Quick Barcodes:
            </span>
            {sampleBarcodes.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleScan(item.barcode)}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-700 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                title={`Click to simulate scanning ${item.name} (${item.barcode})`}
              >
                <Sparkles className="h-2.5 w-2.5 text-blue-500" />
                <span className="max-w-[100px] truncate">{item.name.split(' ')[0]}</span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400">({item.barcode.slice(-4)})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lastScanned && (
        <div className="mt-2 text-[11px] font-medium text-blue-600 dark:text-blue-400">
          Last scan: <span className="font-semibold">{lastScanned}</span>
        </div>
      )}
    </div>
  );
}
