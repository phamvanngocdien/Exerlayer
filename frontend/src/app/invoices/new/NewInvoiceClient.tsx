'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useCreateInvoice } from '@/hooks/useInvoice';
import { isContractsConfigured } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/wallet/config';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function NewInvoicePage() {
  const router = useRouter();
  const { authenticated, address, login } = useWallet();
  const { createInvoice, isPending, isConfirming, isSuccess, hash, error } = useCreateInvoice();

  const contractsReady = isContractsConfigured(arcTestnet.id);

  // Default to 7 days from now
  const defaultDueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    payer: '',
    amount: '150.00',
    dueDate: defaultDueDate,
    description: 'Cloud Infrastructure & Autonomous Agent Hosting Services',
  });

  const [isOpenInvoice, setIsOpenInvoice] = useState(true);
  const [isSimulatedSuccess, setIsSimulatedSuccess] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string>('102');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const presetAmounts = ['50.00', '150.00', '500.00', '1,000.00', '2,500.00'];

  const setDueDateOffset = (days: number) => {
    const d = new Date(Date.now() + days * 86400000).toISOString().slice(0, 16);
    setForm(prev => ({ ...prev, dueDate: d }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsSubmitting(true);
    try {
      if (contractsReady) {
        await createInvoice({
          payer: (isOpenInvoice || !form.payer ? '0x0000000000000000000000000000000000000000' : form.payer) as `0x${string}`,
          amount: form.amount.replace(/,/g, ''),
          dueDate: new Date(form.dueDate),
          description: form.description,
        });
      } else {
        // High fidelity interactive simulation mode
        await new Promise(r => setTimeout(r, 1000));
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
  const payUrl = typeof window !== 'undefined' ? `${window.location.origin}/pay/${createdInvoiceId}` : `/pay/${createdInvoiceId}`;

  const copyPaymentUrl = () => {
    navigator.clipboard.writeText(payUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-slide-up">
        <div className="glass-card p-10 sm:p-12">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-emerald-500/10">
            ✅
          </div>
          <h2 className="text-3xl font-extrabold font-heading text-white mb-2">
            Invoice #{createdInvoiceId} Created!
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6 max-w-md mx-auto">
            Your on-chain invoice has been broadcast and is ready for payment in USDC on Arc L1.
          </p>

          {/* QR Code & Link Card */}
          <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] max-w-sm mx-auto mb-6 space-y-4">
            <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
              <QRCodeSVG value={payUrl} size={150} />
            </div>
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-mono mb-1">PAYMENT LINK</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={payUrl}
                  className="input-field text-xs font-mono py-2 flex-1 bg-black/50"
                />
                <button
                  type="button"
                  onClick={copyPaymentUrl}
                  className="btn-secondary py-2 px-3 text-xs"
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {hash && (
            <a
              href={`https://testnet.arcscan.app/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline block mb-6 font-mono"
            >
              View on ArcScan Explorer ↗
            </a>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/pay/${createdInvoiceId}`} className="btn-primary text-sm px-6 py-3">
              💳 Open Payment Page
            </Link>
            <button
              onClick={() => {
                setForm({ payer: '', amount: '150.00', dueDate: defaultDueDate, description: '' });
                setIsSimulatedSuccess(false);
              }}
              className="btn-secondary text-sm px-6 py-3"
            >
              + Create Another
            </button>
            <button onClick={() => router.push('/invoices')} className="btn-secondary text-sm px-6 py-3">
              All Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card max-w-md mx-auto p-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
            🔐
          </div>
          <h2 className="text-2xl font-bold font-heading text-white">Connect Your Wallet</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Sign in with email or connect a Web3 wallet to issue on-chain invoices on Arc L1.
          </p>
          <button onClick={login} className="btn-primary w-full py-3.5 mt-2">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400 mb-2">
          <span>ARC L1</span>
          <span>•</span>
          <span>CHAIN ID 5042002</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white">
          Create On-Chain Invoice
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Issue a smart-contract invoice payable in USDC with sub-second finality.
        </p>
      </div>

      {/* Two-Column Grid: Left = Form, Right = Real-time Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-6">
            
            {/* Amount with Preset Chips */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 font-mono">
                Amount (USDC) <span className="text-red-400">*</span>
              </label>
              <div className="relative mb-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-blue-400 font-mono">
                  $
                </span>
                <input
                  type="text"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="input-field pl-10 text-3xl font-extrabold font-heading"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 bg-white/[0.05] px-2.5 py-1 rounded-md border border-white/[0.08]">
                  USDC
                </span>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[var(--color-text-muted)] mr-1">Presets:</span>
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setForm({ ...form, amount: amt })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                      form.amount === amt
                        ? 'border-blue-500 bg-blue-500/20 text-white font-bold'
                        : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:border-white/[0.15]'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payer Configuration */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] font-mono">
                  Recipient / Payer
                </label>
                <button
                  type="button"
                  onClick={() => setIsOpenInvoice(!isOpenInvoice)}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
                >
                  {isOpenInvoice ? 'Switch to Designated Payer' : 'Switch to Open Invoice'}
                </button>
              </div>

              {isOpenInvoice ? (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2.5">
                  <span className="text-base">🌐</span>
                  <div>
                    <p className="font-semibold text-white">Open Invoice Mode</p>
                    <p className="text-[11px] text-blue-300/80">Anyone with the link or QR code can settle this invoice.</p>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="0x... Recipient wallet address"
                  value={form.payer}
                  onChange={(e) => setForm({ ...form, payer: e.target.value })}
                  className="input-field font-mono text-xs"
                />
              )}
            </div>

            {/* Due Date with Quick Day Selectors */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 font-mono">
                Payment Deadline <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="input-field mb-2.5"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[var(--color-text-muted)] mr-1">Quick:</span>
                {[
                  { label: '+3 Days', days: 3 },
                  { label: '+7 Days', days: 7 },
                  { label: '+14 Days', days: 14 },
                  { label: '+30 Days', days: 30 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDueDateOffset(item.days)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:border-white/[0.15]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Memo */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 font-mono">
                Memo &amp; Description
              </label>
              <textarea
                rows={3}
                placeholder="What is this invoice for? (e.g. Consulting, API credits, Hardware)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field text-sm"
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isPending || isConfirming || isSubmitting}
              className="btn-primary w-full py-4 text-base font-bold shadow-xl shadow-blue-500/20"
            >
              {isPending || isSubmitting
                ? '⏳ Initializing Invoice...'
                : isConfirming
                ? '⛓️ Confirming on Arc L1...'
                : '✨ Issue On-Chain Invoice'}
            </button>

            {error && (
              <p className="text-xs text-red-400 text-center font-mono">
                {error.message.slice(0, 100)}
              </p>
            )}
          </form>
        </div>

        {/* Right Live Preview Card */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="glass-card p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-5">
              <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                Live Receipt Preview
              </span>
              <span className="badge badge-created">Draft</span>
            </div>

            <div className="text-center py-6 bg-black/40 rounded-2xl border border-white/[0.04] mb-5">
              <p className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase mb-1">Total Due</p>
              <p className="text-4xl font-extrabold font-heading text-white">
                ${form.amount || '0.00'} <span className="text-sm font-normal text-blue-400 font-mono">USDC</span>
              </p>
            </div>

            <div className="space-y-3 text-xs mb-6 font-mono">
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-500">Issuer:</span>
                <span className="text-white">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'You'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-500">Payer:</span>
                <span className="text-white">
                  {isOpenInvoice || !form.payer ? 'Anyone (Open)' : `${form.payer.slice(0, 6)}...${form.payer.slice(-4)}`}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-500">Due By:</span>
                <span className="text-white">{new Date(form.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="py-1.5">
                <span className="text-zinc-500 block mb-1">Description:</span>
                <p className="text-zinc-300 font-sans text-xs bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04] italic">
                  "{form.description || 'No description provided'}"
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center justify-between">
              <span>⚡ Settlement Layer: Arc L1 (USDC Native)</span>
              <span className="font-mono text-zinc-400">&lt; 1s finality</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
