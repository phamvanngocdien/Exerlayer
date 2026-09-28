'use client';

import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { useInvoicesByCreator, useInvoiceById } from '@/hooks/useInvoice';
import { isContractsConfigured } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/wallet/config';
import { useState } from 'react';

const STATUS_MAP: Record<number, { label: string; class: string }> = {
  0: { label: 'Created', class: 'badge-created' },
  1: { label: 'Paid', class: 'badge-paid' },
  2: { label: 'Cancelled', class: 'badge-cancelled' },
  3: { label: 'Overdue', class: 'badge-overdue' },
};

function StatusBadge({ status }: { status: number }) {
  const { label, class: className } = STATUS_MAP[status] || STATUS_MAP[0];
  return <span className={`badge ${className}`}>{label}</span>;
}

function InvoiceCard({ invoiceId }: { invoiceId: bigint }) {
  const { data: invoice } = useInvoiceById(invoiceId);

  if (!invoice) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-4 bg-[var(--color-surface)] rounded w-1/3 mb-3" />
        <div className="h-3 bg-[var(--color-surface)] rounded w-1/2" />
      </div>
    );
  }

  const amount = (Number(invoice.amount) / 1e6).toFixed(2);
  const dueDate = new Date(Number(invoice.dueDate) * 1000);
  const isOverdue = invoice.status === 0 && dueDate < new Date();
  const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Link href={`/pay/${invoice.id}`}>
      <div className="glass-card p-6 cursor-pointer group hover:border-[var(--color-accent)] transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">
              Invoice #{invoice.id.toString()}
            </p>
            <p className="text-2xl font-bold">${amount} USDC</p>
          </div>
          <StatusBadge status={isOverdue ? 3 : invoice.status} />
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4 line-clamp-2">
          {invoice.description || 'No description'}
        </p>

        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>
            {invoice.payer === '0x0000000000000000000000000000000000000000'
              ? '🌐 Open invoice'
              : `To: ${shortenAddr(invoice.payer)}`}
          </span>
          <span>Due: {dueDate.toLocaleDateString()}</span>
        </div>

        <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-violet-500 mt-4 transition-all duration-300 rounded-full" />
      </div>
    </Link>
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
  return (
    <Link href={`/pay/${item.id}`}>
      <div className="glass-card p-6 cursor-pointer group hover:border-[var(--color-accent)] transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">
              Invoice #{item.id}
            </p>
            <p className="text-2xl font-bold">${item.amount} USDC</p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4 line-clamp-2">
          {item.desc}
        </p>

        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>{item.payer}</span>
          <span>Due: {item.due}</span>
        </div>

        <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-violet-500 mt-4 transition-all duration-300 rounded-full" />
      </div>
    </Link>
  );
}

export default function InvoicesPage() {
  const { address, authenticated } = useWallet();
  const { data: invoiceIds, isLoading } = useInvoicesByCreator(address);
  const [filter, setFilter] = useState<'all' | 'created' | 'paid' | 'overdue'>('all');
  const contractsReady = isContractsConfigured(arcTestnet.id);

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
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="glass-card max-w-md mx-auto p-12">
          <p className="text-4xl mb-4">🔐</p>
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6">
            Sign in with email or connect a wallet to view your invoices.
          </p>
          <Link href="/pay/demo" className="btn-secondary text-sm">
            View Live Demo Pay Page
          </Link>
        </div>
      </div>
    );
  }

  const hasOnChainInvoices = invoiceIds && invoiceIds.length > 0;

  const filteredDemo = demoInvoices.filter((inv) => {
    if (filter === 'all') return true;
    if (filter === 'created') return inv.status === 0;
    if (filter === 'paid') return inv.status === 1;
    if (filter === 'overdue') return inv.status === 3;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your on-chain invoices payable on Arc L1
          </p>
        </div>
        <Link href="/invoices/new" className="btn-primary">
          ✨ New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'created', 'paid', 'overdue'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] border border-transparent'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-[var(--color-surface)] rounded w-1/3 mb-3" />
              <div className="h-8 bg-[var(--color-surface)] rounded w-1/2 mb-4" />
              <div className="h-3 bg-[var(--color-surface)] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : hasOnChainInvoices ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {[...invoiceIds].reverse().map((id) => (
            <InvoiceCard key={id.toString()} invoiceId={id} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filteredDemo.map((item) => (
              <DemoInvoiceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
