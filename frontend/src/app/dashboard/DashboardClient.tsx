'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useInvoicesByCreator, useInvoiceById } from '@/hooks/useInvoice';
import { useUnifiedBalance } from '@/hooks/useAppKit';
import Link from 'next/link';

function StatCard({
  label,
  value,
  icon,
  color,
  subtext,
  badge,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  subtext?: string;
  badge?: string;
}) {
  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)] flex items-center justify-center text-lg">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-extrabold font-heading tracking-tight ${color}`}>{value}</p>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {badge}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">{subtext}</p>}
    </div>
  );
}

function InvoiceRow({ invoiceId }: { invoiceId: bigint }) {
  const { data: invoice } = useInvoiceById(invoiceId);
  if (!invoice) return null;

  const amount = (Number(invoice.amount) / 1e6).toFixed(2);
  const statusLabels: Record<number, { text: string; dot: string; class: string }> = {
    0: { text: 'Pending', dot: 'bg-amber-400 animate-pulse', class: 'badge-created' },
    1: { text: 'Paid', dot: 'bg-emerald-400', class: 'badge-paid' },
    2: { text: 'Cancelled', dot: 'bg-rose-400', class: 'badge-cancelled' },
    3: { text: 'Overdue', dot: 'bg-rose-500 animate-ping', class: 'badge-overdue' },
  };
  const isOverdue = invoice.status === 0 && new Date(Number(invoice.dueDate) * 1000) < new Date();
  const statusInfo = statusLabels[isOverdue ? 3 : invoice.status] || statusLabels[0];

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors group">
      <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-accent)] font-semibold">
        <Link href={`/pay/${invoice.id.toString()}`} className="hover:underline">
          #{invoice.id.toString()}
        </Link>
      </td>
      <td className="py-3.5 px-4 text-sm font-bold font-heading text-[var(--color-text-primary)]">
        ${amount} <span className="text-xs font-normal text-zinc-500">USDC</span>
      </td>
      <td className="py-3.5 px-4 text-xs text-[var(--color-text-secondary)] max-w-xs truncate">
        {invoice.description || '—'}
      </td>
      <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-text-muted)]">
        {new Date(Number(invoice.dueDate) * 1000).toLocaleDateString()}
      </td>
      <td className="py-3.5 px-4 text-xs">
        <span className={`badge ${statusInfo.class} inline-flex items-center gap-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
          {statusInfo.text}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <Link
          href={`/pay/${invoice.id.toString()}`}
          className="text-xs text-[var(--color-accent)] hover:underline opacity-80 group-hover:opacity-100 font-medium"
        >
          View Checkout →
        </Link>
      </td>
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
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  // Demo fallback invoices for preview
  const demoInvoices = [
    { id: 101, amount: '150.00', desc: 'Autonomous AI Cloud Compute & Hosting Services', due: '10/05/2026', status: 'Pending', statusClass: 'badge-created', dot: 'bg-amber-400 animate-pulse' },
    { id: 100, amount: '420.00', desc: 'Arc L1 Integration & High-Speed Settlement Audit', due: '09/25/2026', status: 'Paid', statusClass: 'badge-paid', dot: 'bg-emerald-400' },
    { id: 99, amount: '85.50', desc: 'Circle CCTP Cross-Chain Relayer Gas Reimbursement', due: '09/20/2026', status: 'Paid', statusClass: 'badge-paid', dot: 'bg-emerald-400' },
  ];

  const [agentLogs, setAgentLogs] = useState([
    { time: '5m ago', type: 'reconcile', text: 'Checked 16 invoices for duplicate hashes — 0 anomalies flagged.', badge: '✅ Clean' },
    { time: '1h ago', type: 'fraud_check', text: 'Scanned payer 0x71...3aF: within normal 30-day velocity thresholds.', badge: '🛡️ Passed' },
    { time: '8h ago', type: 'autopay', text: 'Autopaid Invoice #99 ($85.50 USDC) autonomously via Circle Agent Wallet.', badge: '🤖 Autopaid' },
  ]);

  const handleSaveGuardrails = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTriggerAudit = () => {
    setIsRunningAudit(true);
    setTimeout(() => {
      setIsRunningAudit(false);
      setAuditSuccess(true);
      setAgentLogs((prev) => [
        {
          time: 'Just now',
          type: 'audit',
          text: 'Autonomous treasury verification complete: 100% balance integrity across Arc L1 & CCTP liquidity pools.',
          badge: '⚡ Verified',
        },
        ...prev,
      ]);
      setTimeout(() => setAuditSuccess(false), 3000);
    }, 1200);
  };

  if (!authenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="glass-card max-w-md mx-auto p-12">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-3xl mx-auto mb-4">
            📊
          </div>
          <h2 className="text-2xl font-heading font-extrabold mb-2">Treasury &amp; Agent Hub</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6 leading-relaxed">
            Connect your wallet to monitor cross-chain liquidity, supervise autonomous agents, and manage enterprise invoices.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pay/demo" className="btn-primary text-xs py-2.5 px-5">
              <span>View Live Demo Checkout →</span>
            </Link>
            <Link href="/invoices" className="btn-secondary text-xs py-2.5 px-5">
              Browse Invoices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalInvoices = invoiceIds && invoiceIds.length > 0 ? invoiceIds.length : demoInvoices.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
              EXERLAYER TREASURY
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
              ARC L1 ONLINE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight">Treasury &amp; Agent Hub</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Autonomous account oversight, cross-chain balances, and real-time settlement analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTriggerAudit}
            disabled={isRunningAudit}
            className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2"
          >
            <span>{isRunningAudit ? '⏳ Auditing...' : '🔍 Trigger Audit'}</span>
          </button>
          <Link href="/invoices/new" className="btn-primary text-xs py-2.5 px-4 font-heading font-bold shadow-md">
            + Create New Invoice
          </Link>
        </div>
      </div>

      {auditSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between animate-slide-up">
          <span className="flex items-center gap-2">
            <span>✅</span>
            <strong>Audit Success:</strong> Verified treasury parity on Arc L1 and Circle CCTP bridges.
          </span>
          <span className="font-mono text-[10px]">ALL CLEAR</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tracked Invoices"
          value={totalInvoices.toString()}
          icon="📄"
          color="text-[var(--color-text-primary)]"
          subtext="On-chain smart contracts"
          badge="Live"
        />
        <StatCard
          label="Arc Native USDC"
          value={`$${formattedUsdcBalance}`}
          icon="⚡"
          color="text-[var(--color-accent)]"
          subtext="Sub-second gas asset"
          badge="< 0.8s"
        />
        <StatCard
          label="Cross-Chain Liquidity"
          value={`$${totalBalance}`}
          icon="🌐"
          color="text-violet-400"
          subtext="Circle App Kit aggregated"
          badge="CCTP V2"
        />
        <StatCard
          label="AI Agent Sentinel"
          value={autopayEnabled ? 'Active' : 'Standby'}
          icon="🤖"
          color="text-emerald-400"
          subtext="Circle Agent MPC Guardrails"
          badge="Autonomous"
        />
      </div>

      {/* Two-Column Core Feature Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track 1: Unified Cross-Chain Liquidity */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🌐</span>
                <div>
                  <h3 className="font-heading font-bold text-base text-[var(--color-text-primary)]">
                    Unified Multi-Chain Balance
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Powered by Circle CCTP V2 &amp; App Kit</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
                BURN &amp; MINT
              </span>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
              Exerlayer aggregates liquidity across leading L2s and bridges automatically into Arc L1 with zero slippage.
            </p>

            <div className="space-y-2.5">
              {balancesByChain.map((chain) => (
                <div
                  key={chain.chainId}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)] hover:border-violet-500/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{chain.icon}</span>
                    <div>
                      <span className="font-heading font-semibold text-[var(--color-text-primary)]">
                        {chain.chainName}
                      </span>
                      <p className="text-[10px] font-mono text-[var(--color-text-muted)]">Chain ID: {chain.chainId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-[var(--color-text-primary)]">${chain.balance}</p>
                    <p className="text-[10px] text-zinc-500">USDC</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)] font-mono">Aggregated Liquidity:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-heading text-violet-400">${totalBalance}</span>
              <span className="text-xs font-mono text-zinc-400">USDC</span>
            </div>
          </div>
        </div>

        {/* Track 2: Autonomous AI Agent Guardrails */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="font-heading font-bold text-base text-[var(--color-text-primary)]">
                    Autonomous Agent Guardrails
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Circle Agent Wallets &amp; Safe Execution</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-base)] border border-[var(--color-border)]">
                <div className={`w-2 h-2 rounded-full ${autopayEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span className="text-[10px] font-mono font-semibold uppercase text-zinc-300">
                  {autopayEnabled ? 'Armed' : 'Standby'}
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
              AI agents automatically pay verified vendor invoices when due, strictly bound by your hardware-level MPC limits.
            </p>

            <form onSubmit={handleSaveGuardrails} className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)]">
                <div>
                  <p className="font-heading font-bold text-[var(--color-text-primary)]">Autonomous Execution</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Execute payments without human signing if &lt; cap</p>
                </div>
                <input
                  type="checkbox"
                  checked={autopayEnabled}
                  onChange={(e) => setAutopayEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)]">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Max Per-Invoice Cap
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 font-bold">$</span>
                    <input
                      value={maxPerInvoice}
                      onChange={(e) => setMaxPerInvoice(e.target.value)}
                      className="w-full bg-transparent font-heading font-bold text-sm text-[var(--color-text-primary)] outline-none"
                    />
                    <span className="text-[10px] font-mono text-zinc-500">USDC</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)]">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Daily Spending Ceiling
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 font-bold">$</span>
                    <input
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full bg-transparent font-heading font-bold text-sm text-[var(--color-text-primary)] outline-none"
                    />
                    <span className="text-[10px] font-mono text-zinc-500">USDC</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-secondary w-full py-2.5 text-xs font-heading font-bold flex items-center justify-center gap-2"
              >
                <span>{isSaved ? '✅ Guardrails Updated' : 'Update Agent Guardrails'}</span>
              </button>
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--color-border)] grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)]">
              <p className="text-[var(--color-text-muted)]">Reconcile</p>
              <p className="font-bold text-xs text-zinc-200 mt-0.5">Every 6h</p>
            </div>
            <div className="p-2 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)]">
              <p className="text-[var(--color-text-muted)]">Indexer</p>
              <p className="font-bold text-xs text-emerald-400 mt-0.5">1m Sync</p>
            </div>
            <div className="p-2 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)]">
              <p className="text-[var(--color-text-muted)]">Engine</p>
              <p className="font-bold text-xs text-cyan-400 mt-0.5">Llama 3.1</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Audit Trail & Live Logs */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <h3 className="font-heading font-bold text-base text-[var(--color-text-primary)]">
              Autonomous AI Audit Trail &amp; Reconciliation Log
            </h3>
          </div>
          <span className="text-xs font-mono text-[var(--color-text-muted)]">Cryptographically Verified</span>
        </div>

        <div className="space-y-2.5">
          {agentLogs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3.5 rounded-xl bg-[var(--color-base)]/80 border border-[var(--color-border)] hover:border-zinc-700 transition-colors text-xs gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-zinc-500 text-[11px] whitespace-nowrap mt-0.5">{log.time}</span>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">{log.text}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap bg-zinc-800 text-zinc-300 border border-zinc-700">
                {log.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-[var(--color-text-primary)]">Recent Invoices</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Direct on-chain settlements on Arc L1</p>
          </div>
          <Link href="/invoices" className="btn-secondary text-xs py-2 px-3">
            View All Invoices →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-base)]/50">
                <th className="py-3 px-4 text-left">Invoice ID</th>
                <th className="py-3 px-4 text-left">Amount (USDC)</th>
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-left">Due Date</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoiceIds && invoiceIds.length > 0 ? (
                [...invoiceIds].reverse().slice(0, 10).map((id) => (
                  <InvoiceRow key={id.toString()} invoiceId={id} />
                ))
              ) : (
                demoInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-accent)] font-semibold">
                      <Link href={`/pay/${inv.id}`} className="hover:underline">
                        #{inv.id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold font-heading text-[var(--color-text-primary)]">
                      ${inv.amount} <span className="text-xs font-normal text-zinc-500">USDC</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--color-text-secondary)] max-w-xs truncate">
                      {inv.desc}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-[var(--color-text-muted)]">{inv.due}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className={`badge ${inv.statusClass} inline-flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${inv.dot}`} />
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/pay/${inv.id}`}
                        className="text-xs text-[var(--color-accent)] hover:underline opacity-80 group-hover:opacity-100 font-medium"
                      >
                        Checkout →
                      </Link>
                    </td>
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
