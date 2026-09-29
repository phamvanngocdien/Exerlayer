'use client';

import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';

export default function HomePage() {
  const { authenticated, login } = useWallet();
  const [demoState, setDemoState] = useState<'idle' | 'settling' | 'settled'>('idle');

  const triggerDemoSettlement = () => {
    setDemoState('settling');
    setTimeout(() => {
      setDemoState('settled');
    }, 850);
  };

  return (
    <div className="relative overflow-hidden pb-20">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[130px]" />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading, Pitch, CTA */}
          <div className="lg:col-span-7 space-y-8 animate-slide-up text-center lg:text-left">
            {/* Network & Track Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-xs font-mono text-blue-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">Arc L1 Native</span>
              <span className="text-zinc-500">•</span>
              <span>Circle App Kit &amp; Agent Stack</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] font-heading">
              Invoice Payments{' '}
              <span className="gradient-text block">Reimagined On-Chain</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Stablecoin-native invoicing with <strong className="text-white">sub-second settlement</strong> on Arc L1.
              Pay in native USDC from any chain via Circle CCTP, while autonomous AI agents manage your accounts payable with zero human intervention.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              {authenticated ? (
                <>
                  <Link href="/invoices/new" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto">
                    <span>✨</span>
                    <span>Create Invoice</span>
                  </Link>
                  <Link href="/dashboard" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                    <span>📊</span>
                    <span>Treasury Dashboard</span>
                  </Link>
                </>
              ) : (
                <>
                  <button onClick={login} className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto shadow-lg shadow-blue-500/25">
                    <span>🔗</span>
                    <span>Connect Wallet</span>
                  </button>
                  <Link href="/pay/demo" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                    <span>💳</span>
                    <span>Live Checkout Demo</span>
                  </Link>
                </>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[var(--color-border)] text-left">
              <div>
                <p className="text-2xl font-extrabold font-heading text-white">&lt; 1s</p>
                <p className="text-xs text-[var(--color-text-muted)]">Sub-second Finality</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold font-heading text-emerald-400">100%</p>
                <p className="text-xs text-[var(--color-text-muted)]">USDC Native Gas</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold font-heading text-cyan-400">0%</p>
                <p className="text-xs text-[var(--color-text-muted)]">CCTP V2 Slippage</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Demo Widget */}
          <div className="lg:col-span-5 animate-fade-in">
            <div className="glass-card p-6 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-[var(--color-text-muted)] ml-2">invoice_0x89a.sol</span>
                </div>
                <span className="badge badge-created">⚡ Live Preview</span>
              </div>

              {/* Amount Display */}
              <div className="text-center py-6 bg-black/30 rounded-2xl border border-white/[0.04] mb-6">
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1 font-mono">Invoice #101 Amount</p>
                <p className="text-4xl sm:text-5xl font-extrabold font-heading text-white tracking-tight">
                  $1,250.00 <span className="text-sm font-normal text-blue-400 font-mono">USDC</span>
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  To: <span className="font-mono text-zinc-400">0x71C...3aF</span> (Cloud Infrastructure)
                </p>
              </div>

              {/* Live Flow Steps */}
              <div className="space-y-3 text-xs mb-6 font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">Settlement Protocol:</span>
                  <span className="text-blue-400 font-semibold">Arc L1 Native</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">Cross-Chain Route:</span>
                  <span className="text-violet-400 font-semibold">Circle CCTP V2 (Domain 3 ➔ 5042002)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-zinc-400">AI Agent Guardrail:</span>
                  <span className="text-emerald-400 font-semibold">Within $5,000 Daily Cap ✅</span>
                </div>
              </div>

              {/* Interactive Demo Action */}
              {demoState === 'idle' && (
                <button
                  onClick={triggerDemoSettlement}
                  className="w-full btn-primary py-3 text-sm font-semibold rounded-xl"
                >
                  ⚡ Test Sub-Second Settlement
                </button>
              )}

              {demoState === 'settling' && (
                <div className="w-full py-3 px-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center text-xs font-mono text-blue-300 flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>Settling on Arc L1 (0.8s)...</span>
                </div>
              )}

              {demoState === 'settled' && (
                <div className="space-y-2 animate-fade-in">
                  <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs font-mono text-emerald-300 flex items-center justify-center gap-2">
                    <span>✅ Settled in 0.78s • Tx: 0x8a...3f9</span>
                  </div>
                  <button
                    onClick={() => setDemoState('idle')}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 w-full text-center block pt-1"
                  >
                    Reset Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dual Track Showcase: Track 1 (DeFi) & Track 2 (Agentic) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[var(--color-border)]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 mb-2">
            Engineered for the Arc Ecosystem
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold font-heading text-white">
            Two Tracks. One Unified Platform.
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mt-4">
            Exerlayer bridges enterprise DeFi stablecoin rails with autonomous AI agent economies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 stagger-children">
          {/* Card 1: Track 1 - DeFi */}
          <div className="glass-card p-8 sm:p-10 flex flex-col justify-between group hover:border-blue-500/40">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-3xl mb-6 shadow-lg shadow-blue-500/10">
                💰
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300 font-semibold mb-3">
                Track 1: DeFi &amp; Stablecoins
              </div>
              <h3 className="text-2xl font-bold font-heading text-white mb-3">
                Stablecoin-Native Financial Rails
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
                Built natively on Arc L1 where gas fees are paid directly in USDC. Eliminate Ethereum gas friction, leverage Circle App Kit for instant cross-chain CCTP V2 burn-and-mint transfers, and route payments seamlessly from any chain.
              </p>
              
              <ul className="space-y-2.5 text-xs text-zinc-300 font-medium border-t border-[var(--color-border)] pt-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Zero Gas Volatility</strong> — Gas paid in USDC on Arc</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Circle CCTP V2 Bridge</strong> — 1:1 burn-and-mint with zero slippage</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Unified Balance</strong> — Multi-chain liquidity view for optimal routing</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link href="/invoices/new" className="text-sm text-blue-400 font-semibold hover:text-blue-300 flex items-center gap-1.5">
                Issue a Native Invoice <span>→</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Track 2 - Agentic Economy */}
          <div className="glass-card p-8 sm:p-10 flex flex-col justify-between group hover:border-violet-500/40">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center text-3xl mb-6 shadow-lg shadow-violet-500/10">
                🤖
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-mono text-violet-300 font-semibold mb-3">
                Track 2: Agentic Economy
              </div>
              <h3 className="text-2xl font-bold font-heading text-white mb-3">
                Autonomous AI Agent Treasury
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
                Empower AI agents with their own MPC wallets using Circle Agent Stack. Agents autonomously reconcile invoices, flag fraudulent burst anomalies, and execute autopay within strictly enforced on-chain guardrails.
              </p>
              
              <ul className="space-y-2.5 text-xs text-zinc-300 font-medium border-t border-[var(--color-border)] pt-6">
                <li className="flex items-center gap-2">
                  <span className="text-violet-400">✓</span>
                  <span><strong>Circle Agent MPC Wallets</strong> — Autonomous signing with x402</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-violet-400">✓</span>
                  <span><strong>Strict Guardrails</strong> — Per-invoice limits &amp; daily spending caps</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-violet-400">✓</span>
                  <span><strong>Immutable Audit Trail</strong> — Every action logged &amp; verified</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link href="/dashboard" className="text-sm text-violet-400 font-semibold hover:text-violet-300 flex items-center gap-1.5">
                Configure Agent Guardrails <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Architecture Flow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[var(--color-border)]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold font-heading text-white">How Exerlayer Works</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Sub-second invoice lifecycle from creation to automated reconciliation
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6">
            <span className="text-3xl mb-4 block">📝</span>
            <p className="text-xs font-mono text-blue-400 mb-1">STEP 01</p>
            <h4 className="font-bold text-base text-white mb-2">Create Invoice</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Creator specifies amount and due date. Smart contract generates on-chain record on Arc L1 with unique ID.
            </p>
          </div>

          <div className="glass-card p-6">
            <span className="text-3xl mb-4 block">🌉</span>
            <p className="text-xs font-mono text-cyan-400 mb-1">STEP 02</p>
            <h4 className="font-bold text-base text-white mb-2">Route Payment</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Pay directly on Arc in USDC, bridge via Circle CCTP from Arbitrum/Base, or swap any token to USDC in 1 click.
            </p>
          </div>

          <div className="glass-card p-6">
            <span className="text-3xl mb-4 block">🛡️</span>
            <p className="text-xs font-mono text-violet-400 mb-1">STEP 03</p>
            <h4 className="font-bold text-base text-white mb-2">Agent Verification</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              AI agent performs fraud detection, checks burst patterns, and verifies daily spending guardrails.
            </p>
          </div>

          <div className="glass-card p-6">
            <span className="text-3xl mb-4 block">⚡</span>
            <p className="text-xs font-mono text-emerald-400 mb-1">STEP 04</p>
            <h4 className="font-bold text-base text-white mb-2">Instant Settlement</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Sub-second finality on Arc L1. Event indexer records receipt and updates treasury balances automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-card p-10 sm:p-16 text-center relative overflow-hidden bg-gradient-to-b from-blue-900/20 via-slate-900/40 to-slate-900/80 border border-blue-500/20">
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300">
              Ready for Production
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white">
              Start Accepting On-Chain Payments Today
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              No gas friction. Instant settlement. AI-powered accounts payable.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/invoices/new" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto">
                Create First Invoice →
              </Link>
              <Link href="/pay/demo" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                Explore Demo Checkout
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
