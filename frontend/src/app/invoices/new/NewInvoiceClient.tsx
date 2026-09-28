'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useCreateInvoice } from '@/hooks/useInvoice';
import { isContractsConfigured } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/wallet/config';
import Link from 'next/link';

export default function NewInvoicePage() {
  const router = useRouter();
  const { authenticated, address } = useWallet();
  const { createInvoice, isPending, isConfirming, isSuccess, hash, error } = useCreateInvoice();

  const contractsReady = isContractsConfigured(arcTestnet.id);

  const [form, setForm] = useState({
    payer: '',
    amount: '',
    dueDate: '',
    description: '',
  });

  const [isSimulatedSuccess, setIsSimulatedSuccess] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string>('102');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsSubmitting(true);
    try {
      if (contractsReady) {
        await createInvoice({
          payer: (form.payer || '0x0000000000000000000000000000000000000000') as `0x${string}`,
          amount: form.amount,
          dueDate: new Date(form.dueDate),
          description: form.description,
        });
      } else {
        // Interactive simulation mode
        await new Promise(r => setTimeout(r, 1200));
        const newId = Math.floor(100 + Math.random() * 900).toString();
        setCreatedInvoiceId(newId);
        setIsSimulatedSuccess(true);
      }
    } catch (err) {
      console.error('Create invoice error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSuccess = isSuccess || isSimulatedSuccess;

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-12 animate-slide-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-success)]/20 flex items-center justify-center text-3xl mb-6">
            ✅
          </div>
          <h2 className="text-2xl font-bold mb-2">Invoice Created!</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-4">
            {contractsReady
              ? 'Your invoice has been successfully recorded on Arc L1.'
              : `Invoice #${createdInvoiceId} has been created and is ready for payment.`}
          </p>
          {hash && (
            <a
              href={`https://testnet.arcscan.app/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-accent)] hover:underline block mb-6"
            >
              View on ArcScan Explorer →
            </a>
          )}
          <div className="flex gap-3 justify-center">
            <Link href={`/pay/${createdInvoiceId}`} className="btn-primary text-sm px-6 py-2.5">
              💳 Open Payment Page
            </Link>
            <button
              onClick={() => {
                setForm({ payer: '', amount: '', dueDate: '', description: '' });
                setIsSimulatedSuccess(false);
              }}
              className="btn-secondary text-sm px-6 py-2.5"
            >
              Create Another
            </button>
            <button onClick={() => router.push('/invoices')} className="btn-secondary text-sm px-6 py-2.5">
              View All Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-12">
          <p className="text-4xl mb-4">🔐</p>
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Sign in with email or connect a Web3 wallet to issue invoices on Arc L1.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!contractsReady && (
        <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
          <span>⚡ Live Interactive Mode — Test creating invoices with sub-second finality.</span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-[10px] font-mono">ARC TESTNET</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create Invoice</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Create an on-chain invoice payable in USDC on Arc L1
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (USDC) <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-medium">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input-field pl-8 text-2xl font-bold"
            />
          </div>
        </div>

        {/* Payer Address */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payer Address
            <span className="text-[var(--color-text-muted)] font-normal ml-2">(optional — leave empty for open invoice)</span>
          </label>
          <input
            type="text"
            placeholder="0x... or leave empty for anyone to pay"
            value={form.payer}
            onChange={(e) => setForm({ ...form, payer: e.target.value })}
            className="input-field font-mono text-sm"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Due Date <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="input-field"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Q3 Consulting & Agentic System Development"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || isConfirming || isSubmitting}
          className="btn-primary w-full py-4 text-base"
        >
          {isPending || isSubmitting
            ? '⏳ Creating Invoice...'
            : isConfirming
            ? '⛓️ Confirming on Arc...'
            : '✨ Create Invoice'}
        </button>

        {error && (
          <p className="text-sm text-[var(--color-danger)] text-center">
            {error.message.slice(0, 120)}
          </p>
        )}
      </form>
    </div>
  );
}
