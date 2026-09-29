'use client';

import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { useInvoicesByCreator, useInvoiceById } from '@/hooks/useInvoice';
import { useState } from 'react';

const STATUS_MAP: Record<number, { label: string; class: string; icon: string }> = {
  0: { label: 'Created', class: 'badge-created', icon: '⏳' },
  1: { label: 'Paid', class: 'badge-paid', icon: '✅' },
  2: { label: 'Cancelled', class: 'badge-cancelled', icon: '❌' },
  3: { label: 'Overdue', class: 'badge-overdue', icon: '⚠️' },
};

function StatusBadge({ status }: { status: number }) {
  const { label, class: className, icon } = STATUS_MAP[status] || STATUS_MAP[0];
  return (
    <span className={`badge ${className}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function InvoiceCard({ invoiceId }: { invoiceId: bigint }) {
  const { data: invoice } = useInvoiceById(invoiceId);

  if (!invoice) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-4 bg-white/[0.05] rounded w-1/3 mb-3" />
        <div className="h-8 bg-white/[0.05] rounded w-1/2 mb-4" />
        <div className="h-3 bg-white/[0.05] rounded w-2/3" />
      </div>
    );
  }

  const amount = (Number(invoice.amount) / 1e6).toFixed(2);
  const dueDate = new Date(Number(invoice.dueDate) * 1000);
  const isOverdue = invoice.status === 0 && dueDate < new Date();
  const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="glass-card p-6 flex flex-col justify-between group hover:border-blue-500/40">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] block mb-1">
              INVOICE #{invoice.id.toString()}
            </span>
            <p className="text-3xl font-extrabold font-heading text-white">
              ${amount} <span className="text-xs font-normal text-blue-400 font-mono">USDC</span>
            </p>
          </div>
          <StatusBadge status={isOverdue ? 3 : invoice.status} />
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">
          {invoice.description || 'No description provided'}
        </p>

        <div className="space-y-1.5 text-[11px] font-mono text-[var(--color-text-muted)] border-t border-white/[0.05] pt-3">
          <div className="flex justify-between">
            <span>Recipient:</span>
            <span className="text-zinc-300">
              {invoice.payer === '0x0000000000000000000000000000000000000000'
                ? '🌐 Anyone (Open)'
                : shortenAddr(invoice.payer)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Deadline:</span>
            <span className={isOverdue ? 'text-red-400 font-bold' : 'text-zinc-300'}>
              {dueDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
        <Link
          href={`/pay/${invoice.id.toString()}`}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <span>Open Checkout</span>
          <span>→</span>
        </Link>
        <button
          onClick={() => {
            const url = `${window.location.origin}/pay/${invoice.id.toString()}`;
            navigator.clipboard.writeText(url);
          }}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono"
        >
          📋 Copy Link
        </button>
      </div>
    </div>
  );
}

interface DemoInvoiceProps {
  id: string;
  amount: string;
  desc: string;
  due: string;
  payer: string;
  status: number;
}

function DemoInvoiceCard({ item }: { item: DemoInvoiceProps }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="glass-card p-6 flex flex-col justify-between group hover:border-blue-500/40">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] block mb-1">
              INVOICE #{item.id}
            </span>
            <p className="text-3xl font-extrabold font-heading text-white">
              ${item.amount} <span className="text-xs font-normal text-blue-400 font-mono">USDC</span>
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">
          {item.desc}
        </p>

        <div className="space-y-1.5 text-[11px] font-mono text-[var(--color-text-muted)] border-t border-white/[0.05] pt-3">
          <div className="flex justify-between">
            <span>Recipient:</span>
            <span className="text-zinc-300">{item.payer}</span>
          </div>
          <div className="flex justify-between">
            <span>Deadline:</span>
            <span className="text-zinc-300">{item.due}</span>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
        <Link
          href={`/pay/${item.id}`}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <span>Open Checkout</span>
          <span>→</span>
        </Link>
        <button
          onClick={() => {
            const url = `${window.location.origin}/pay/${item.id}`;
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono"
        >
          {copied ? 'Copied!' : '📋 Copy Link'}
        </button>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const { address, authenticated, login } = useWallet();
  const { data: invoiceIds, isLoading } = useInvoicesByCreator(address);
  const [filter, setFilter] = useState<'all' | 'created' | 'paid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const demoInvoices: DemoInvoiceProps[] = [
    {
      id: '101',
      amount: '150.00',
      desc: 'Q3 Cloud Infrastructure & Autonomous Agent Hosting Services',
      due: '10/05/2026',
      payer: '🌐 Open invoice',
      status: 0,
    },
    {
      id: '100',
      amount: '420.00',
      desc: 'Arc L1 Integration & Smart Contract Audit & Fuzz Testing',
      due: '09/25/2026',
      payer: 'To: 0x8a9B...4dE1',
      status: 1,
    },
    {
      id: '99',
      amount: '85.50',
      desc: 'Circle CCTP Relayer Gas Subsidy & Liquidity Pool Rebalance',
      due: '09/20/2026',
      payer: 'To: 0x4f2A...9C10',
      status: 1,
    },
  ];

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card max-w-md mx-auto p-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
            🔐
          </div>
          <h2 className="text-2xl font-bold font-heading text-white">Connect Your Wallet</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Sign in with email or connect your wallet to manage and track invoices.
          </p>
          <button onClick={login} className="btn-primary w-full py-3.5 mt-2">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const hasOnChainInvoices = invoiceIds && invoiceIds.length > 0;

  const filteredDemo = demoInvoices.filter((inv) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'created' && inv.status === 0) ||
      (filter === 'paid' && inv.status === 1) ||
      (filter === 'overdue' && inv.status === 3);

    const matchesSearch =
      inv.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-white">Invoice Portfolio</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Track, issue, and manage all on-chain payments on Arc L1
          </p>
        </div>
        <Link href="/invoices/new" className="btn-primary text-sm px-6 py-2.5 shadow-lg shadow-blue-500/20">
          + Issue Invoice
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">🔍</span>
          <input
            type="text"
            placeholder="Search invoice # or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'created', 'paid', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize whitespace-nowrap ${
                filter === f
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {f === 'created' ? 'Pending' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-white/[0.05] rounded w-1/3 mb-3" />
              <div className="h-8 bg-white/[0.05] rounded w-1/2 mb-4" />
              <div className="h-3 bg-white/[0.05] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : hasOnChainInvoices ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {[...invoiceIds].reverse().map((id) => (
            <InvoiceCard key={id.toString()} invoiceId={id} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {filteredDemo.map((item) => (
            <DemoInvoiceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
