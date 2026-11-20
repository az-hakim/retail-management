import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniRetail — Multi-Tenant Cloud POS & Retail Inventory Management SaaS",
  description: "Enterprise multi-tenant retail management system featuring barcode scanning POS, offline-first sync, immutable stock ledgers, branch transfers, automated GRN, and row-level security (RLS).",
  keywords: ["retail", "pos", "multi-tenant", "inventory", "stock ledger", "barcode scanner", "point of sale"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-full flex-col bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50`}
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
