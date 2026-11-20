'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { playScanBeep } from '@/lib/utils';
import { Barcode, Scan, Sparkles, Command, CheckCircle2, AlertCircle } from 'lucide-react';

interface BarcodeScannerInputProps {
  onScanSuccess: (item: { product: any; variant?: any }) => void;
  onScanError?: (barcode: string) => void;
}

export function BarcodeScannerInput({ onScanSuccess, onScanError }: BarcodeScannerInputProps) {
  const { findProductByBarcode, products } = useApp();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScanned, setLastScanned] = useState<{ text: string; success: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey '/' to immediately focus the scanner input
  useEffect(() => {
    inputRef.current?.focus();

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleScan = (codeToScan?: string) => {
    const code = (codeToScan || barcodeInput).trim();
    if (!code) return;

    const result = findProductByBarcode(code);
    if (result) {
      playScanBeep(true);
      setLastScanned({ text: `Matched: ${result.product.name}`, success: true });
      onScanSuccess(result);
      setBarcodeInput('');
    } else {
      playScanBeep(false);
      if (onScanError) onScanError(code);
      setLastScanned({ text: `Barcode Not Found: "${code}"`, success: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  // Sample quick barcodes for rapid testing
  const sampleBarcodes = products.slice(0, 4).map(p => ({
    name: p.name,
    barcode: p.barcode,
    sku: p.sku,
  }));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-xs backdrop-blur dark:border-zinc-800/90 dark:bg-zinc-900/90">
      {/* 2026 Laser Optical Beam Indicator Effect */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-red-500 to-transparent opacity-75 shadow-sm shadow-red-500/50 animate-laser" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 dark:text-zinc-400">
            <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2.5 pl-10 pr-28 text-sm font-mono font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:bg-zinc-900 transition-all"
            placeholder="Scan barcode with scanner or enter SKU... (Press '/' to focus)"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute inset-y-1.5 right-1.5 flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Command className="h-2.5 w-2.5" />
              <span>/</span>
            </span>
            <button
              onClick={() => handleScan()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
            >
              <Barcode className="h-3.5 w-3.5" />
              <span>Scan</span>
            </button>
          </div>
        </div>

        {/* Quick barcode simulation buttons for testing */}
        {sampleBarcodes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-zinc-600 dark:text-zinc-400 font-semibold whitespace-nowrap text-[10px] uppercase tracking-wider">
              Presets:
            </span>
            {sampleBarcodes.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleScan(item.barcode)}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                title={`Click to simulate scanning ${item.name} (${item.barcode})`}
              >
                <Sparkles className="h-2.5 w-2.5 text-blue-500" />
                <span className="max-w-[85px] truncate">{item.name.split(' ')[0]}</span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">({item.barcode.slice(-4)})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lastScanned && (
        <div
          className={`mt-2 flex items-center gap-1.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 ${
            lastScanned.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {lastScanned.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span>{lastScanned.text}</span>
        </div>
      )}
    </div>
  );
}
