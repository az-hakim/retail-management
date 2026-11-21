'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2, LockKeyhole, Store, ShieldCheck } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'alex@apexgear.com', role: 'Tenant Owner · Apex Electronics' },
  { email: 'sarah.cashier@apexgear.com', role: 'Cashier · Flagship Downtown' },
  { email: 'marcus.stock@apexgear.com', role: 'Inventory Clerk · Apex Electronics' },
  { email: 'owner@freshmart.com', role: 'Tenant Owner · FreshMart' },
  { email: 'admin@omniretail.app', role: 'Platform Super Admin' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const showDemoHints = process.env.NODE_ENV !== 'production';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.message === 'string' ? data.message : 'Sign-in failed. Please try again.'
        );
        setPending(false);
        return;
      }

      const next = new URLSearchParams(window.location.search).get('next');
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      // Full document load so the app shell boots with the new session cookie.
      window.location.assign(target);
    } catch {
      setError('Network error. Check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-zinc-100 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <Store className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              OmniRetail
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Multi-tenant POS &amp; Cloud ERP
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Sign in</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Use the credentials issued by your workspace owner.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60 disabled:shadow-none"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              <span>{pending ? 'Signing in…' : 'Sign in'}</span>
            </button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
            <ShieldCheck className="h-3 w-3" />
            Sessions are signed, HTTP-only and expire automatically.
          </p>
        </div>

        {showDemoHints && (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-3 text-[11px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <p className="mb-1 font-semibold text-zinc-600 dark:text-zinc-300">
              Development accounts
            </p>
            <ul className="space-y-0.5">
              {DEMO_ACCOUNTS.map(account => (
                <li key={account.email}>
                  <span className="font-mono">{account.email}</span> — {account.role}
                </li>
              ))}
            </ul>
            <p className="mt-1">
              Password: <span className="font-mono">DemoPass123!</span> (or{' '}
              <span className="font-mono">AUTH_SEED_PASSWORD</span>)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
