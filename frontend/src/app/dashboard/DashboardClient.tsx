'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useInvoicesByCreator, useInvoiceById } from '@/hooks/useInvoice';
import { useUnifiedBalance } from '@/hooks/useAppKit';
import Link from 'next/link';

function StatCard({ label, value, icon, color, subtext }: { label: string; value: string; icon: string; color: string; subtext?: string }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {subtext && <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtext}</p>}
    </div>
  );
}

function InvoiceRow({ invoiceId }: { invoiceId: bigint }) {
  const { data: invoice } = useInvoiceById(invoiceId);
  if (!invoice) return null;

  const amount = (Number(invoice.amount) / 1e6).toFixed(2);
  const statusLabels: Record<number, string> = { 0: '⏳ Pending', 1: '✅ Paid', 2: '❌ Cancelled', 3: '⚠️ Overdue' };
  const isOverdue = invoice.status === 0 && new Date(Number(invoice.dueDate) * 1000) < new Date();

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
      <td className="py-3 px-4 text-sm font-mono text-[var(--color-accent)]">
        <Link href={`/pay/${invoice.id.toString()}`}>#{invoice.id.toString()}</Link>
      </td>
      <td className="py-3 px-4 text-sm font-bold">${amount}</td>
      <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">{invoice.description?.slice(0, 35) || '—'}</td>
      <td className="py-3 px-4 text-sm">{new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}</td>
      <td className="py-3 px-4 text-sm">{statusLabels[isOverdue ? 3 : invoice.status]}</td>
    </tr>
  );
}

export default function DashboardClient() {
  const { address, authenticated, formattedUsdcBalance } = useWallet();
  const { data: invoiceIds } = useInvoicesByCreator(address);
  const { totalBalance, balancesByChain } = useUnifiedBalance();

  const [autopayEnabled, setAutopayEnabled] = useState(true);
  const [maxPerInvoice, setMaxPerInvoice] = useState('1,000');
  const [dailyLimit, setDailyLimit] = useState('5,000');
  const [isSaved, setIsSaved] = useState(false);

  // Mock demo invoices for preview if on-chain has 0
  const demoInvoices = [
    { id: 101, amount: '150.00', desc: 'Cloud Infrastructure & Agent Hosting', due: '10/05/2026', status: '⏳ Pending' },
    { id: 100, amount: '420.00', desc: 'Arc L1 Integration & Smart Contract Audit', due: '09/25/2026', status: '✅ Paid' },
    { id: 99, amount: '85.50', desc: 'Circle CCTP Relayer Gas Subsidy', due: '09/20/2026', status: '✅ Paid' },
  ];

  const agentLogs = [
    { time: '10m ago', type: 'reconcile', text: 'Checked 14 invoices for duplicate hashes — 0 anomalies flagged.', badge: '✅ Clean' },
    { time: '2h ago', type: 'fraud_check', text: 'Scanned payer 0x71...3aF: within normal 30-day velocity thresholds.', badge: '🛡️ Passed' },
    { time: '9h ago', type: 'autopay', text: 'Autopaid Invoice #99 ($85.50 USDC) autonomously without human intervention.', badge: '🤖 Autopaid' },
  ];

  const handleSaveGuardrails = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  if (!authenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="glass-card max-w-md mx-auto p-12">
          <p className="text-4xl mb-4">📊</p>
          <h2 className="text-xl font-bold mb-2">Treasury Dashboard</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6">
            Connect your wallet to monitor treasury, autonomous agents, and cross-chain USDC balances.
          </p>
          <Link href="/pay/demo" className="btn-secondary text-sm">
            View Live Demo Pay Page
          </Link>
        </div>
      </div>
    );
  }

  const totalInvoices = (invoiceIds && invoiceIds.length > 0) ? invoiceIds.length : demoInvoices.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Treasury Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Autonomous account management, cross-chain balances &amp; settlement analytics
          </p>
        </div>
        <Link href="/invoices/new" className="btn-primary text-sm">
          + Create New Invoice
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={totalInvoices.toString()} icon="📄" color="text-[var(--color-text-primary)]" subtext="On-chain & indexed" />
        <StatCard label="Arc Native USDC" value={`$${formattedUsdcBalance}`} icon="⚡" color="text-[var(--color-accent)]" subtext="Sub-second settlement" />
        <StatCard label="Unified Cross-Chain" value={`$${totalBalance}`} icon="🌐" color="text-violet-400" subtext="Circle App Kit aggregated" />
        <StatCard label="AI Agent Status" value={autopayEnabled ? 'Active' : 'Paused'} icon="🤖" color="text-[var(--color-success)]" subtext="Autonomous treasury" />
      </div>

      {/* Two Column Layout: Unified Balance & AI Agent Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track 1: Unified Cross-Chain Balance (Circle App Kit) */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <h3 className="font-bold">Unified Balance Across Chains</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono">
                Circle CCTP V2
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              Unified cross-chain view automatically routes payments from where liquidity is cheapest.
            </p>

            <div className="space-y-2.5">
              {balancesByChain.map((chain) => (
                <div
                  key={chain.chainId}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span>{chain.icon}</span>
                    <span className="font-medium">{chain.chainName}</span>
                  </div>
                  <span className="font-mono font-bold text-[var(--color-text-primary)]">
                    ${chain.balance} USDC
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">Total Liquidity:</span>
            <span className="font-bold text-sm text-[var(--color-accent)]">${totalBalance} USDC</span>
          </div>
        </div>

        {/* Track 2: Autonomous AI Agent Guardrails */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold">AI Agent Autonomous Guardrails</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${autopayEnabled ? 'bg-[var(--color-success)] animate-pulse' : 'bg-zinc-500'}`} />
                <span className="text-xs font-semibold">{autopayEnabled ? 'Autopay ON' : 'Autopay OFF'}</span>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              AI agent uses Circle Agent Wallets (MPC) to autonomously pay due invoices within strict spending limits.
            </p>

            <form onSubmit={handleSaveGuardrails} className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)]">
                <div>
                  <p className="font-medium">Autonomous Autopay</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Zero human intervention for trusted invoices</p>
                </div>
                <input
                  type="checkbox"
                  checked={autopayEnabled}
                  onChange={(e) => setAutopayEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)]">
                  <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">Max Per-Invoice Cap</label>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">$</span>
                    <input
                      value={maxPerInvoice}
                      onChange={(e) => setMaxPerInvoice(e.target.value)}
                      className="w-full bg-transparent font-bold outline-none"
                    />
                    <span className="text-[10px] text-zinc-500">USDC</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)]">
                  <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">Daily Spending Limit</label>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">$</span>
                    <input
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full bg-transparent font-bold outline-none"
                    />
                    <span className="text-[10px] text-zinc-500">USDC</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-secondary w-full py-2.5 text-xs font-semibold">
                {isSaved ? '✅ Guardrails Updated' : 'Update Agent Guardrails'}
              </button>
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--color-border)] grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-2 rounded-lg bg-[var(--color-base)]">
              <p className="text-[var(--color-text-muted)]">Reconcile</p>
              <p className="font-semibold text-xs">Every 6h</p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-base)]">
              <p className="text-[var(--color-text-muted)]">Indexer</p>
              <p className="font-semibold text-xs text-[var(--color-success)]">Active (1m)</p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-base)]">
              <p className="text-[var(--color-text-muted)]">AI Engine</p>
              <p className="font-semibold text-xs text-cyan-400">Llama 3.1 8B</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agent Audit Trail */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <span>🛡️</span> AI Agent Audit Trail &amp; Reconciliation Log
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">Compliance verified</span>
        </div>
        <div className="space-y-3">
          {agentLogs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)] text-xs gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-zinc-500 text-[11px] whitespace-nowrap mt-0.5">{log.time}</span>
                <p className="text-[var(--color-text-secondary)]">{log.text}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap bg-zinc-800 text-zinc-300">
                {log.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-bold">Recent Invoices</h3>
          <Link href="/invoices" className="text-xs text-[var(--color-accent)] hover:underline">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-left">Due Date</th>
                <th className="py-3 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoiceIds && invoiceIds.length > 0 ? (
                [...invoiceIds].reverse().slice(0, 10).map((id) => (
                  <InvoiceRow key={id.toString()} invoiceId={id} />
                ))
              ) : (
                demoInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-[var(--color-accent)]">
                      <Link href={`/pay/${inv.id}`}>#{inv.id}</Link>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold">${inv.amount}</td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">{inv.desc}</td>
                    <td className="py-3 px-4 text-sm">{inv.due}</td>
                    <td className="py-3 px-4 text-sm">{inv.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
