'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, ProductVariant, Sale } from '@/types';
import { formatCurrency, playScanBeep } from '@/lib/utils';
import { BarcodeScannerInput } from './BarcodeScannerInput';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { ShiftCloseModal } from './ShiftCloseModal';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Lock,
  Layers,
  Search,
} from 'lucide-react';

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unit_price: number;
}

export function POSView() {
  const { activeTenant, activeBranch, products, categories } = useApp();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isShiftCloseOpen, setIsShiftCloseOpen] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Variant selector state
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  // Keyboard shortcut: [F2] opens the charge / checkout flow when a ticket is active
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !isCheckoutOpen && !isReceiptOpen && cart.length > 0) {
        e.preventDefault();
        setIsCheckoutOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, isReceiptOpen, cart.length]);

  if (!activeTenant || !activeBranch) {
    return <div className="p-8 text-center text-zinc-500">Loading terminal context...</div>;
  }

  const symbol = activeTenant.settings.currency_symbol || '$';

  // Filter products by active category & search
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'ALL' && p.category_id !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchBarcode = p.barcode.includes(q);
      if (!matchName && !matchSku && !matchBarcode) return false;
    }
    return true;
  });

  const addToCart = (product: Product, variant?: ProductVariant) => {
    playScanBeep(true);
    setCart(prev => {
      const existingIndex = prev.findIndex(item => {
        if (variant) {
          return item.product.id === product.id && item.variant?.id === variant.id;
        }
        return item.product.id === product.id && !item.variant;
      });

      const price = variant ? variant.retail_price : product.retail_price;

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }

      return [
        ...prev,
        {
          product,
          variant,
          quantity: 1,
          unit_price: price,
        },
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const item = next[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index] = { ...item, quantity: newQty };
      return next;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setDiscountAmount(0);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const calculatedDiscount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : discountAmount;
  const netTaxable = Math.max(0, subtotal - calculatedDiscount);

  const taxConfig = activeTenant.settings.tax_config;
  const taxRate = taxConfig.enabled ? taxConfig.default_rate : 0;
  let taxAmount = 0;
  if (taxConfig.enabled && taxRate > 0) {
    if (taxConfig.inclusive) {
      taxAmount = netTaxable - netTaxable / (1 + taxRate / 100);
    } else {
      taxAmount = (netTaxable * taxRate) / 100;
    }
  }

  const totalAmount = taxConfig.inclusive ? netTaxable : netTaxable + taxAmount;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:p-6">
      {/* Left Column: Barcode Scanner, Filters & Product Grid */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* Hardware Barcode Scanner bar */}
        <BarcodeScannerInput
          onScanSuccess={result => {
            addToCart(result.product, result.variant);
          }}
        />

        {/* Categories Bar & Search Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter catalog by name, SKU or barcode..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(product => {
              const branchStock = product.stock_by_branch[activeBranch.id] || 0;
              const isLowStock = branchStock <= (product.reorder_level || 5);
              const isOutOfStock = branchStock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (product.has_variants && product.variants && product.variants.length > 0) {
                      setSelectedProductForVariant(product);
                    } else {
                      addToCart(product);
                    }
                  }}
                  className={`group relative flex flex-col justify-between rounded-xl border bg-white p-3.5 shadow-2xs transition hover:shadow-md cursor-pointer select-none dark:bg-zinc-900 ${
                    isOutOfStock
                      ? 'border-red-200 opacity-75 dark:border-red-900/50'
                      : 'border-zinc-200 hover:border-blue-400 dark:border-zinc-800 dark:hover:border-blue-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="font-mono text-zinc-400 dark:text-zinc-500">{product.sku}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {branchStock} {product.unit_of_measure}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-xs font-bold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                        {formatCurrency(product.retail_price, symbol)}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">{product.barcode}</div>
                    </div>

                    {product.has_variants ? (
                      <span className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        <Layers className="h-3 w-3" />
                        <span>Variants</span>
                      </span>
                    ) : (
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/50 dark:text-blue-400">
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Search className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-xs font-semibold">No products found matching criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Cart / Ticket Drawer */}
      <div className="flex min-h-0 w-full flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:w-96 lg:flex-none dark:border-zinc-800 dark:bg-zinc-900">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Current Ticket</h2>
              <p className="text-[10px] text-zinc-500 font-medium">Terminal: {activeBranch.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={() => setIsShiftCloseOpen(true)}
              title="Close Shift / Z-Report"
              className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Shift</span>
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2 pr-1">
          {cart.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-800/40"
            >
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {item.product.name}
                </h4>
                {item.variant && (
                  <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 truncate">
                    {item.variant.name}
                  </p>
                )}
                <div className="text-[11px] font-medium text-zinc-500">
                  {formatCurrency(item.unit_price, symbol)} each
                </div>
              </div>

              {/* Quantity steppers */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQuantity(index, -1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(index, 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Item Line Total & Delete */}
              <div className="flex items-center gap-1.5 pl-2">
                <div className="w-14 text-right font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(item.unit_price * item.quantity, symbol)}
                </div>
                <button
                  onClick={() => removeFromCart(index)}
                  title="Remove item"
                  className="p-1 text-zinc-400 hover:text-red-500 transition"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
              <ShoppingCart className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-xs font-medium">Cart is empty.</p>
              <p className="text-[10px] text-zinc-400">Scan barcodes or click items to add.</p>
            </div>
          )}
        </div>

        {/* Cart Totals & Checkout Actions */}
        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800 space-y-2">
          {/* Quick Discount Pill Selector */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Discount:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    setDiscountPercent(pct);
                    setDiscountAmount(0);
                  }}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${
                    discountPercent === pct
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Subtotal & Taxes breakdown */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, symbol)}</span>
            </div>
            {calculatedDiscount > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                <span>Discount ({discountPercent}%)</span>
                <span>-{formatCurrency(calculatedDiscount, symbol)}</span>
              </div>
            )}
            {taxConfig.enabled && (
              <div className="flex justify-between text-zinc-500">
                <span>
                  {taxConfig.tax_id_label} ({taxRate}%)
                </span>
                <span>{formatCurrency(taxAmount, symbol)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-extrabold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
              <span>Total Due</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatCurrency(totalAmount, symbol)}
              </span>
            </div>
          </div>

          {/* Charge Button */}
          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
          >
            <CreditCard className="h-4 w-4" />
            <span>Charge {formatCurrency(totalAmount, symbol)}</span>
            <kbd className="ml-1 hidden rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/90 sm:inline">
              F2
            </kbd>
          </button>
        </div>
      </div>

      {/* Variant Selector Modal */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Select Variant: {selectedProductForVariant.name}
            </h3>
            <div className="mt-3 space-y-2">
              {selectedProductForVariant.variants?.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => {
                    addToCart(selectedProductForVariant, variant);
                    setSelectedProductForVariant(null);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-200 p-3 text-left hover:border-blue-500 hover:bg-blue-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{variant.name}</div>
                    <div className="text-[10px] font-mono text-zinc-400">{variant.sku}</div>
                  </div>
                  <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    {formatCurrency(variant.retail_price, symbol)}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedProductForVariant(null)}
              className="mt-4 w-full rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={calculatedDiscount}
        taxRate={taxRate}
        taxAmount={taxAmount}
        totalAmount={totalAmount}
        onSaleComplete={sale => {
          setIsCheckoutOpen(false);
          setCompletedSale(sale);
          setIsReceiptOpen(true);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        onNewSale={() => {
          clearCart();
          setCompletedSale(null);
        }}
      />

      {/* Shift Close Modal */}
      <ShiftCloseModal
        isOpen={isShiftCloseOpen}
        onClose={() => setIsShiftCloseOpen(false)}
      />
    </div>
  );
}
