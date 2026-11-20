'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  GitCommit,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  WifiOff,
  CheckCircle2,
  Lock,
  Boxes,
  ScrollText,
  Printer,
  ChevronRight,
  ChevronLeft,
  Activity,
  Gauge,
  Keyboard,
} from 'lucide-react';

type FlowType = 'POS_ACID_FLOW' | 'OFFLINE_SYNC_FLOW' | 'TENANT_RLS_FLOW' | 'PROCUREMENT_GRN_FLOW';

interface FlowStep {
  id: string;
  title: string;
  short: string;
  actor: string;
  description: string;
  latency: number;
  icon: React.ComponentType<{ className?: string }>;
  payloadPreview: string;
  optimization: string;
}

interface FlowDefinition {
  title: string;
  subtitle: string;
  accent: string;
  steps: FlowStep[];
}

export function UMLFlowView() {
  const { activeTenant, activeBranch } = useApp();
  const [selectedFlow, setSelectedFlow] = useState<FlowType>('POS_ACID_FLOW');
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tenantLabel = activeTenant?.name || 'Apex';
  const tenantIdShort = activeTenant?.id ? `${activeTenant.id.slice(0, 12)}…` : 'tnt_apex…';
  const branchCode = activeBranch?.code || 'BR-01';

  const flows: Record<FlowType, FlowDefinition> = {
    POS_ACID_FLOW: {
      title: 'POS Checkout & ACID Ledger',
      subtitle: 'Scan to immutable ledger entry and thermal ESC/POS dispatch.',
      accent: 'text-emerald-600 dark:text-emerald-400',
      steps: [
        {
          id: 's1',
          title: 'Optical barcode scan',
          short: 'Scan',
          actor: 'Scanner',
          description:
            'Sub-20ms SKU lookup against the in-memory tenant trie and pg_trgm index cache.',
          latency: 14,
          icon: Zap,
          payloadPreview: 'EAN13: 8901234567890 → iPhone 15 Pro ($999.00)',
          optimization: 'Cache SKUs per tenant in memory so a scan never waits on Postgres.',
        },
        {
          id: 's2',
          title: 'UUIDv7 idempotency stamp',
          short: 'Ticket',
          actor: 'Client guard',
          description:
            'Time-ordered UUIDv7 minted on the client before dispatch, so retries can never double-charge.',
          latency: 2,
          icon: GitCommit,
          payloadPreview: 'X-Idempotency-Key: 018dc600-7099-7000-8000-000000000001',
          optimization: 'Generate the key offline-first; the server only needs the unique constraint.',
        },
        {
          id: 's3',
          title: 'Tenant context guard',
          short: 'Auth',
          actor: 'Middleware',
          description:
            'Validates the session and binds the request to a verified tenant_id before any query runs.',
          latency: 5,
          icon: Lock,
          payloadPreview: `Tenant: ${tenantLabel} (${tenantIdShort})`,
          optimization: 'One session lookup per request — reuse the resolved context downstream.',
        },
        {
          id: 's4',
          title: 'ACID decrement',
          short: 'Commit',
          actor: 'PostgreSQL',
          description:
            'Single transaction: row lock, stock >= requested check, decrement on-hand balance.',
          latency: 18,
          icon: Database,
          payloadPreview: `${branchCode} · Stock 15 → 14 (delta −1)`,
          optimization:
            'Keep the lock window to one row and one statement to avoid serialization retries.',
        },
        {
          id: 's5',
          title: 'Ledger journal post',
          short: 'Ledger',
          actor: 'Audit engine',
          description:
            'Appends a permanent SALE_OUT row with the cost basis snapshot and invoice reference.',
          latency: 8,
          icon: ScrollText,
          payloadPreview: 'SALE_OUT · Cost snapshot $780.00 · Ref INV-202611-0042',
          optimization: 'Append-only writes batch cleanly; never update historical movement rows.',
        },
        {
          id: 's6',
          title: 'Discount compliance',
          short: 'Audit',
          actor: 'Security',
          description:
            'Discounts above 10% or manual price overrides write an audit trail with user and IP hash.',
          latency: 4,
          icon: ShieldCheck,
          payloadPreview: 'Audit: clean (0% discount) → compliance passed',
          optimization: 'Run the check after commit so compliance work never blocks the sale.',
        },
        {
          id: 's7',
          title: 'ESC/POS receipt',
          short: 'Print',
          actor: 'Spooler',
          description:
            'Raster byte commands formatted for 58mm / 80mm roll printers, queued asynchronously.',
          latency: 12,
          icon: Printer,
          payloadPreview: '480 bytes ESC/POS → printed',
          optimization: 'Print outside the request path; the receipt is not part of the commit.',
        },
      ],
    },
    OFFLINE_SYNC_FLOW: {
      title: 'Offline-First Sync',
      subtitle: 'IndexedDB buffer with idempotent reconciliation on reconnect.',
      accent: 'text-amber-600 dark:text-amber-400',
      steps: [
        {
          id: 'o1',
          title: 'Heartbeat loss',
          short: 'Offline',
          actor: 'Observer',
          description:
            'Dropped connection or manual toggle flips the terminal into queue-only mode instantly.',
          latency: 8,
          icon: WifiOff,
          payloadPreview: 'network:offline → IndexedDB store',
          optimization: 'Decide from a local signal — never block a sale on a failed ping.',
        },
        {
          id: 'o2',
          title: 'Queue with UUIDv7',
          short: 'Buffer',
          actor: 'IndexedDB',
          description: 'The sale is serialized locally with its client-generated idempotency key.',
          latency: 3,
          icon: Database,
          payloadPreview: 'queue-9941 → 2 items ($1,018.99) buffered',
          optimization: 'Write once, read rarely: keep the queue append-only and index by key.',
        },
        {
          id: 'o3',
          title: 'Reconnect drain',
          short: 'Drain',
          actor: 'Dispatcher',
          description: 'Online event or a manual sync starts a background drain of the queue.',
          latency: 15,
          icon: Zap,
          payloadPreview: 'network:online → draining [1 pending sale]',
          optimization: 'Drain with backoff and a single in-flight batch to avoid thundering herds.',
        },
        {
          id: 'o4',
          title: 'Idempotency check',
          short: 'Verify',
          actor: 'Gateway',
          description:
            'Server hashes the key so a replayed network retry cannot deduct inventory twice.',
          latency: 12,
          icon: ShieldCheck,
          payloadPreview: 'hash miss → safe to execute once',
          optimization: 'A unique index on the key makes the check free during insert.',
        },
        {
          id: 'o5',
          title: 'Reconcile & evict',
          short: 'Settled',
          actor: 'Ledger',
          description:
            'Items commit to Postgres, stock decrements, and the local entry is purged.',
          latency: 22,
          icon: CheckCircle2,
          payloadPreview: 'synced → local queue empty (0 pending)',
          optimization: 'Evict only after the server ack, keyed by the same idempotency key.',
        },
      ],
    },
    TENANT_RLS_FLOW: {
      title: 'PostgreSQL RLS Isolation',
      subtitle: 'Tenant binding enforced at the database kernel, not in app code.',
      accent: 'text-blue-600 dark:text-blue-400',
      steps: [
        {
          id: 'r1',
          title: 'Identity header',
          short: 'Ingress',
          actor: 'HTTP',
          description: 'The request arrives with a verified JWT claim or tenant context header.',
          latency: 3,
          icon: Lock,
          payloadPreview: `X-Tenant-ID: ${tenantIdShort}`,
          optimization: 'Verify the token once at ingress and pass the parsed claim onward.',
        },
        {
          id: 'r2',
          title: 'SET LOCAL scope',
          short: 'Bind',
          actor: 'Pool',
          description:
            'Binds app.current_tenant_id for this transaction only — never for the pooled session.',
          latency: 4,
          icon: Database,
          payloadPreview: `SET LOCAL app.current_tenant_id = '${tenantIdShort}'`,
          optimization: 'SET LOCAL is transaction-scoped, so pooled connections cannot leak context.',
        },
        {
          id: 'r3',
          title: 'Policy enforcement',
          short: 'Policy',
          actor: 'Kernel',
          description:
            'tenant_isolation_policy automatically appends the tenant predicate to every query.',
          latency: 6,
          icon: ShieldCheck,
          payloadPreview: 'WHERE tenant_id = app.current_tenant_id',
          optimization: 'Index tenant_id first on every table so the injected predicate stays cheap.',
        },
        {
          id: 'r4',
          title: 'Cross-tenant block',
          short: 'Blocked',
          actor: 'RLS guard',
          description:
            'Any lookup targeting another tenant returns zero rows, even from a compromised API layer.',
          latency: 2,
          icon: Lock,
          payloadPreview: 'cross-tenant query → 0 rows (protected)',
          optimization: 'Assert 0 rows in tests per table; that is the real isolation guarantee.',
        },
      ],
    },
    PROCUREMENT_GRN_FLOW: {
      title: 'Procurement & GRN',
      subtitle: 'Purchase order through intake to automatic cost-basis valuation.',
      accent: 'text-purple-600 dark:text-purple-400',
      steps: [
        {
          id: 'p1',
          title: 'Purchase order issued',
          short: 'PO',
          actor: 'Buyer',
          description: 'An authorized PO goes out with agreed unit costs and delivery terms.',
          latency: 10,
          icon: Boxes,
          payloadPreview: 'PO-APX-2026-004 → Anker Global Supply ($1,845.00)',
          optimization: 'Snapshot supplier prices on the PO; later price changes must not rewrite it.',
        },
        {
          id: 'p2',
          title: 'Shipment intake',
          short: 'Intake',
          actor: 'Receiving',
          description: 'Stock arrives at the dock and quantities are checked against the bill of lading.',
          latency: 8,
          icon: Layers,
          payloadPreview: '50× GaN chargers + 100× USB-C cables inspected',
          optimization: 'Capture discrepancies at intake instead of adjusting stock after posting.',
        },
        {
          id: 'p3',
          title: 'GRN generation',
          short: 'GRN',
          actor: 'ERP',
          description: 'Received counts, batch numbers and expiry dates are posted as a goods receipt.',
          latency: 16,
          icon: ScrollText,
          payloadPreview: 'completed → batch BN-2026-N20 tagged',
          optimization: 'One GRN per delivery keeps batches traceable without duplicate postings.',
        },
        {
          id: 'p4',
          title: 'Stock & cost post',
          short: 'Post',
          actor: 'Ledger',
          description:
            'On-hand increments, an immutable PURCHASE_IN row posts, and product cost updates.',
          latency: 14,
          icon: CheckCircle2,
          payloadPreview: 'Stock +50 · cost $28.50 · ledger posted',
          optimization: 'Recalculate weighted cost inside the same transaction as the stock write.',
        },
      ],
    },
  };

  const flowTabs = [
    { id: 'POS_ACID_FLOW', label: 'POS & ACID', icon: Zap },
    { id: 'OFFLINE_SYNC_FLOW', label: 'Offline Sync', icon: WifiOff },
    { id: 'TENANT_RLS_FLOW', label: 'RLS Guard', icon: ShieldCheck },
    { id: 'PROCUREMENT_GRN_FLOW', label: 'Procurement', icon: Boxes },
  ] as const;

  const flow = flows[selectedFlow];
  const steps = flow.steps;
  const step = steps[stepIndex];
  const StepIcon = step.icon;

  const totalLatency = steps.reduce((acc, s) => acc + s.latency, 0);
  const elapsedLatency = steps.slice(0, stepIndex + 1).reduce((acc, s) => acc + s.latency, 0);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const selectFlow = useCallback((id: FlowType) => {
    setSelectedFlow(id);
    setStepIndex(0);
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
  }, [steps.length]);

  const prev = useCallback(() => {
    setStepIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
  }, []);

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex(prev => prev + 1), 1200);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, steps.length]);

  // Keep the active node visible in the rail
  useEffect(() => {
    nodeRefs.current[stepIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [stepIndex, selectedFlow]);

  // Keyboard control: ← → Space Home
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.key === 'Home') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, prev, reset]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/25">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Architecture Flows
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Step through each pipeline · {steps.length} stages · ~{totalLatency}ms total
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <div className="mr-1 hidden items-center gap-1 text-[10px] font-medium text-zinc-400 md:flex dark:text-zinc-500">
              <Keyboard className="h-3.5 w-3.5" />
              <kbd className="rounded border border-zinc-300 px-1 py-0.5 font-mono dark:border-zinc-700">←</kbd>
              <kbd className="rounded border border-zinc-300 px-1 py-0.5 font-mono dark:border-zinc-700">→</kbd>
              <kbd className="rounded border border-zinc-300 px-1 py-0.5 font-mono dark:border-zinc-700">space</kbd>
            </div>

            <button
              onClick={prev}
              disabled={stepIndex === 0}
              aria-label="Previous step"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              aria-label={isPlaying ? 'Pause playback' : 'Play pipeline'}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white shadow-sm transition ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Run'}</span>
            </button>
            <button
              onClick={next}
              disabled={stepIndex >= steps.length - 1}
              aria-label="Next step"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={reset}
              aria-label="Reset pipeline"
              title="Reset (Home)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Flow selector */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {flowTabs.map(tab => {
            const Icon = tab.icon;
            const isSelected = selectedFlow === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => selectFlow(tab.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500/15 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pipeline rail + detail */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{flow.title}</p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-400">Elapsed</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ~{elapsedLatency}ms
              </span>
              <span className="text-zinc-300 dark:text-zinc-600">/ {totalLatency}ms</span>
            </div>
          </div>

          {/* Progress */}
          <div className="h-0.5 w-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-blue-600 transition-[width] duration-300 dark:bg-blue-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Node rail */}
          <div
            role="tablist"
            aria-label="Pipeline stages"
            className="flex items-start gap-1 overflow-x-auto px-3 py-3 [scrollbar-width:thin]"
          >
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === stepIndex;
              const isDone = idx < stepIndex;
              return (
                <React.Fragment key={s.id}>
                  {idx > 0 && (
                    <div className="mt-4 flex h-5 shrink-0 items-center px-0.5 text-zinc-300 dark:text-zinc-700">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <button
                    ref={el => {
                      nodeRefs.current[idx] = el;
                    }}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Stage ${idx + 1}: ${s.title}`}
                    onClick={() => {
                      setStepIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span
                      className={`relative flex h-7 w-7 items-center justify-center rounded-full transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-2 ring-blue-500/25'
                          : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span
                      className={`w-full truncate text-[10px] font-semibold ${
                        isActive
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {s.short}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                      {s.latency}ms
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Detail card */}
          <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200`}
              >
                <StepIcon className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{step.title}</h2>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {step.actor}
              </span>
              <span className="ml-auto font-mono text-[11px] font-semibold text-zinc-400">
                stage {stepIndex + 1}/{steps.length} · {step.latency}ms
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {step.description}
            </p>

            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  <GitCommit className="h-2.5 w-2.5" /> Payload
                </p>
                <p className="break-words font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {step.payloadPreview}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-2.5 w-2.5" /> Efficiency lever
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
                  {step.optimization}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compact metrics */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Gauge className={`mt-0.5 h-4 w-4 shrink-0 ${flow.accent}`} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pipeline budget
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {totalLatency}ms end-to-end across {steps.length} stages.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tenant scope
              </p>
              <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                {tenantLabel} · {branchCode}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Audit posture
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Every movement is append-only and traceable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
