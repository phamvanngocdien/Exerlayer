'use client';

import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';

export default function HomePage() {
  const { authenticated, login } = useWallet();

  return (
    <div className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 mb-8">
            <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
            <span className="text-sm font-medium text-[var(--color-accent)]">
              Live on Arc Testnet
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="block">Invoice Payments</span>
            <span className="gradient-text">Reimagined On-Chain</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Create invoices, get paid in USDC, and let AI agents manage your treasury —
            all with sub-second settlement on Arc L1.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {authenticated ? (
              <>
                <Link href="/invoices/new" className="btn-primary text-base px-8 py-3.5">
                  ✨ Create Invoice
                </Link>
                <Link href="/dashboard" className="btn-secondary text-base px-8 py-3.5">
                  📊 Dashboard
                </Link>
              </>
            ) : (
              <>
                <button onClick={login} className="btn-primary text-base px-8 py-3.5">
                  🔗 Connect Wallet
                </button>
                <Link href="/pay/demo" className="btn-secondary text-base px-8 py-3.5">
                  View Demo Invoice
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 stagger-children">
          {/* DeFi Track */}
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-2xl mb-5">
              💰
            </div>
            <h3 className="text-lg font-bold mb-2">USDC-Native Payments</h3>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              Create invoices and receive payments in USDC on Arc. Gas fees in USDC too — no ETH needed.
              Sub-second finality for instant confirmation.
            </p>
          </div>

          {/* Cross-chain */}
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/20 flex items-center justify-center text-2xl mb-5">
              🌉
            </div>
            <h3 className="text-lg font-bold mb-2">Cross-Chain Bridge & Swap</h3>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              Pay invoices using USDC from any chain via Circle App Kit Bridge.
              Swap tokens to USDC instantly. Unified Balance across all chains.
            </p>
          </div>

          {/* Agentic */}
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center text-2xl mb-5">
              🤖
            </div>
            <h3 className="text-lg font-bold mb-2">AI Agent Autopay</h3>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              Autonomous AI agents hold wallets and auto-pay invoices, detect fraud,
              and reconcile duplicates — no human in the loop.
            </p>
          </div>
        </div>

        {/* Tech Stack Bar */}
        <div className="mt-20 text-center">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-6">
            Built with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
            {['Arc L1', 'USDC', 'App Kit', 'Agent Stack', 'Foundry', 'Next.js', 'Cloudflare Workers'].map((tech) => (
              <div key={tech} className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50">
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
