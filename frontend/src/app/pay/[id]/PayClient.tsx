'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useInvoiceById, usePayInvoice, useApproveUSDC } from '@/hooks/useInvoice';
import { useWallet } from '@/hooks/useWallet';
import { useAppKit, SUPPORTED_SOURCE_CHAINS } from '@/hooks/useAppKit';
import { getContractAddresses, isContractsConfigured } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/wallet/config';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_MAP: Record<number, { label: string; class: string; dotClass: string }> = {
  0: { label: 'Pending Payment', class: 'badge-created', dotClass: 'bg-amber-400 animate-pulse' },
  1: { label: 'Settled & Paid', class: 'badge-paid', dotClass: 'bg-emerald-400' },
  2: { label: 'Cancelled', class: 'badge-cancelled', dotClass: 'bg-rose-400' },
  3: { label: 'Overdue', class: 'badge-overdue', dotClass: 'bg-rose-500 animate-ping' },
};

type PaymentMethod = 'direct' | 'cctp' | 'swap';

export default function PayClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNumericId = /^\d+$/.test(id);
  const invoiceId = isNumericId ? BigInt(id) : undefined;

  const { data: onChainInvoice, isLoading: isOnChainLoading } = useInvoiceById(invoiceId);
  const { authenticated, login, address: userAddress } = useWallet();
  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveUSDC();
  const { payInvoice, isPending: isPaying, isConfirming, isSuccess: paySuccess, hash } = usePayInvoice();
  const { bridgeToArc, swapToUSDC, bridgeStep, bridgeTxHash, errorMessage: bridgeError } = useAppKit();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('direct');
  const [selectedChainId, setSelectedChainId] = useState<number>(SUPPORTED_SOURCE_CHAINS[0].id);
  const [fromToken, setFromToken] = useState<'ETH' | 'USDT'>('ETH');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isSimulatedPaid, setIsSimulatedPaid] = useState(false);
  const [simulatedTxHash, setSimulatedTxHash] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const [step, setStep] = useState<'view' | 'approve' | 'pay' | 'done'>('view');
  const [showQR, setShowQR] = useState(false);

  const payUrl = typeof window !== 'undefined' ? window.location.href : '';

  let addresses: ReturnType<typeof getContractAddresses> | null = null;
  const contractsReady = isContractsConfigured(arcTestnet.id);
  try {
    addresses = getContractAddresses(arcTestnet.id);
  } catch { }

  useEffect(() => {
    if (approveSuccess && step === 'approve') {
      setStep('pay');
    }
  }, [approveSuccess, step]);

  // Demo / fallback invoice when id === 'demo' or on-chain contract is not yet deployed
  const demoInvoice = {
    id: isNumericId ? BigInt(id) : BigInt(101),
    creator: '0x1A2b3C4d5E6F708192a3B4c5D6e7F8091A2b3C4d' as `0x${string}`,
    payer: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    amount: BigInt(150000000), // $150.00 USDC
    dueDate: BigInt(Math.floor(Date.now() / 1000) + 7 * 86400),
    description: 'Autonomous AI Cloud Compute & Continuous High-Frequency Reconciliation',
    status: isSimulatedPaid ? 1 : 0,
    paidAt: isSimulatedPaid ? BigInt(Math.floor(Date.now() / 1000)) : BigInt(0),
    paidBy: isSimulatedPaid ? (userAddress || '0x71C...3aF') : '0x0000000000000000000000000000000000000000',
  };

  const invoice = onChainInvoice || (id === 'demo' || !contractsReady ? demoInvoice : null);
  const isLoading = isNumericId && contractsReady ? isOnChainLoading : false;

  const handleCopy = (text: string, type: 'link' | 'hash') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <div className="glass-card p-12 text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Loading Invoice Details...</p>
          <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">Querying Arc L1 RPC node...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-12">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto mb-4">
            🔍
          </div>
          <h2 className="text-2xl font-heading font-extrabold mb-2">Invoice Not Found</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6 max-w-md mx-auto">
            Invoice #{id} could not be retrieved from the network or contract addresses are not yet initialized.
          </p>
          <Link href="/pay/demo" className="btn-primary inline-flex items-center gap-2 text-sm">
            <span>⚡ View Live Demo Checkout</span>
          </Link>
        </div>
      </div>
    );
  }

  const amount = (Number(invoice.amount) / 1e6).toFixed(2);
  const dueDate = new Date(Number(invoice.dueDate) * 1000);
  const isOverdue = invoice.status === 0 && dueDate < new Date();
  const statusKey = isOverdue ? 3 : invoice.status;
  const { label: statusLabel, class: statusClass, dotClass } = STATUS_MAP[statusKey] || STATUS_MAP[0];
  const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleDirectPay = async () => {
    if (contractsReady && addresses && invoiceId !== undefined) {
      setStep('approve');
      await approve(addresses.invoice, amount);
    } else {
      // Demo / simulated payment execution
      setStep('pay');
      setTimeout(() => {
        const fakeHash = `0xarc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        setSimulatedTxHash(fakeHash);
        setIsSimulatedPaid(true);
        setStep('done');
      }, 1200);
    }
  };

  const handleConfirmPayOnChain = async () => {
    if (invoiceId !== undefined) {
      setStep('pay');
      await payInvoice(invoiceId);
    }
  };

  const handleBridgeAndPay = async () => {
    try {
      const res = await bridgeToArc(amount, selectedChainId);
      setSimulatedTxHash(res.txHash);
      setIsSimulatedPaid(true);
      setStep('done');
    } catch { }
  };

  const handleSwapAndPay = async () => {
    setIsSwapping(true);
    try {
      const res = await swapToUSDC(amount, fromToken);
      setSimulatedTxHash(res.txHash);
      setIsSimulatedPaid(true);
      setStep('done');
    } finally {
      setIsSwapping(false);
    }
  };

  const isCompleted = paySuccess || step === 'done' || invoice.status === 1;
  const finalTxHash = hash || simulatedTxHash;

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="glass-card p-10 relative overflow-hidden border-emerald-500/30">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            ✨
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Settlement Confirmed
          </span>

          <h2 className="text-3xl font-heading font-extrabold tracking-tight mb-2">Payment Completed!</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6">
            Invoice #{id} has been fully settled on Arc Layer 1.
          </p>

          <div className="p-5 rounded-2xl bg-[var(--color-base)]/80 border border-[var(--color-border)] max-w-md mx-auto text-left text-xs space-y-3 mb-6 font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] font-sans text-xs">Total Settled</span>
              <span className="text-xl font-bold font-heading text-emerald-400">${amount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Settlement Layer:</span>
              <span className="text-[var(--color-accent)] font-semibold">Arc L1 (Chain #5042002)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Latency:</span>
              <span className="text-emerald-400 font-semibold">&lt; 0.8s Sub-Second</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Route:</span>
              <span className="capitalize text-[var(--color-text-primary)]">
                {paymentMethod === 'direct' ? 'Direct Arc USDC' : paymentMethod === 'cctp' ? 'Circle CCTP V2 Bridge' : 'DEX Token Swap'}
              </span>
            </div>
            {finalTxHash && (
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <span className="text-[var(--color-text-muted)]">Tx Hash:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 text-[11px] truncate max-w-[170px]">{finalTxHash}</span>
                  <button
                    onClick={() => handleCopy(finalTxHash, 'hash')}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    title="Copy Tx Hash"
                  >
                    {copiedHash ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {finalTxHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${finalTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs py-2.5 px-5 w-full sm:w-auto"
              >
                <span>View on ArcScan Explorer ↗</span>
              </a>
            )}
            <Link href="/invoices" className="btn-secondary text-xs py-2.5 px-5 w-full sm:w-auto">
              ← Return to Invoices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Testnet / Live notice banner */}
      {!contractsReady && (
        <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚡</span>
            <span>
              <strong>Live Interactive Mode:</strong> Test Arc sub-second settlement, Circle CCTP V2 &amp; DEX Swap.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono uppercase tracking-wider text-cyan-200">
            ARC L1
          </span>
        </div>
      )}

      <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                PAYABLE INVOICE
              </span>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">#{id}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">Settlement on Arc Layer 1 with Native USDC</p>
          </div>
          <span className={`badge ${statusClass} inline-flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {statusLabel}
          </span>
        </div>

        {/* Amount Hero */}
        <div className="text-center py-8">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">
            Total Amount Due
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-extrabold font-heading gradient-text tracking-tight">
              ${amount}
            </span>
            <span className="text-lg font-bold text-[var(--color-text-secondary)] font-heading">USDC</span>
          </div>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <span>⚡</span>
            <span>Sub-second settlement (&lt; 0.8s)</span>
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="p-4 rounded-2xl bg-[var(--color-base)]/60 border border-[var(--color-border)] space-y-3 mb-6 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-text-muted)]">Beneficiary / Merchant</span>
            <span className="font-mono text-[var(--color-text-primary)] bg-[var(--color-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              {shortenAddr(invoice.creator)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-text-muted)]">Payer Target</span>
            <span className="font-mono text-[var(--color-text-secondary)]">
              {invoice.payer === '0x0000000000000000000000000000000000000000' ? (
                <span className="text-cyan-400">Open (Any Wallet Can Pay)</span>
              ) : (
                shortenAddr(invoice.payer)
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-text-muted)]">Due Date</span>
            <span className={`font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-[var(--color-text-secondary)]'}`}>
              {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {invoice.description && (
            <div className="pt-2 border-t border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                Description
              </span>
              <p className="text-[var(--color-text-secondary)] leading-relaxed italic">{invoice.description}</p>
            </div>
          )}
        </div>

        {invoice.status === 0 && (
          <div className="space-y-5 pt-2">
            {/* Payment Route Selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-heading font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Select Payment Route
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">No hidden bridge fees</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('direct')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    paymentMethod === 'direct'
                      ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'border-[var(--color-border)] hover:border-zinc-700 bg-[var(--color-base)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">⚡</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Fastest</span>
                  </div>
                  <p className="font-heading font-bold text-sm text-[var(--color-text-primary)]">Direct Arc</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Native USDC &lt;0.8s</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cctp')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    paymentMethod === 'cctp'
                      ? 'bg-violet-500/15 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                      : 'border-[var(--color-border)] hover:border-zinc-700 bg-[var(--color-base)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">🌉</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">CCTP V2</span>
                  </div>
                  <p className="font-heading font-bold text-sm text-[var(--color-text-primary)]">Cross-Chain</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Burn &amp; Mint (0% slippage)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('swap')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    paymentMethod === 'swap'
                      ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'border-[var(--color-border)] hover:border-zinc-700 bg-[var(--color-base)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">🔄</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">DEX</span>
                  </div>
                  <p className="font-heading font-bold text-sm text-[var(--color-text-primary)]">Swap &amp; Pay</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">ETH or USDT to USDC</p>
                </button>
              </div>
            </div>

            {/* Route Details Panel */}
            {paymentMethod === 'direct' && (
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Settlement Chain</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">Arc Testnet (ID 5042002)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Estimated Gas Fee</span>
                  <span className="font-mono text-emerald-400">&lt; $0.0001 USDC (Native Gas)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Finality</span>
                  <span className="text-emerald-400 font-semibold">Immediate Sub-Second (&lt; 0.8s)</span>
                </div>
              </div>
            )}

            {paymentMethod === 'cctp' && (
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-xs space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-violet-300 mb-1.5">
                    Source Chain Liquidity:
                  </label>
                  <select
                    value={selectedChainId}
                    onChange={(e) => setSelectedChainId(Number(e.target.value))}
                    className="w-full bg-[var(--color-base)] border border-violet-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-400"
                  >
                    {SUPPORTED_SOURCE_CHAINS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name} — Available: ${c.usdcBalance} USDC
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
                  <div className="flex justify-between">
                    <span>Cross-Chain Protocol</span>
                    <span className="font-mono text-violet-300">Circle CCTP V2 Official</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slippage &amp; Spread</span>
                    <span className="text-emerald-400 font-semibold">0.00% Guaranteed (1:1 Native USDC)</span>
                  </div>
                </div>

                {bridgeStep !== 'idle' && (
                  <div className="p-3.5 rounded-xl bg-[var(--color-base)] border border-violet-500/30 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="font-heading font-bold text-xs text-violet-300 capitalize">
                        Status: {bridgeStep}...
                      </p>
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      {bridgeStep === 'approving' && 'Step 1/4: Approving USDC on source chain...'}
                      {bridgeStep === 'burning' && 'Step 2/4: Calling depositForBurn on Circle TokenMessenger...'}
                      {bridgeStep === 'attesting' && 'Step 3/4: Polling Circle Iris relayer for signature...'}
                      {bridgeStep === 'minting' && 'Step 4/4: Minting native Arc L1 USDC...'}
                    </p>
                  </div>
                )}
                {bridgeError && <p className="text-rose-400 text-xs font-mono">{bridgeError}</p>}
              </div>
            )}

            {paymentMethod === 'swap' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-3.5">
                <div>
                  <span className="block text-[11px] font-semibold text-emerald-300 mb-2">
                    Pay with Alternative Asset:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFromToken('ETH')}
                      className={`py-2 px-3 rounded-xl border text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 ${
                        fromToken === 'ETH'
                          ? 'border-emerald-400 bg-emerald-500/25 text-white'
                          : 'border-[var(--color-border)] text-zinc-400'
                      }`}
                    >
                      <span>🔷</span> Pay with ETH
                    </button>
                    <button
                      type="button"
                      onClick={() => setFromToken('USDT')}
                      className={`py-2 px-3 rounded-xl border text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 ${
                        fromToken === 'USDT'
                          ? 'border-emerald-400 bg-emerald-500/25 text-white'
                          : 'border-[var(--color-border)] text-zinc-400'
                      }`}
                    >
                      <span>🟢</span> Pay with USDT
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-[var(--color-text-secondary)] font-mono">
                  <span>Estimated Conversion:</span>
                  <span className="text-emerald-300 font-semibold">
                    {fromToken === 'ETH' ? `~${(Number(amount) / 3200).toFixed(4)} ETH` : `~${amount} USDT`}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <div className="space-y-3 pt-2">
              {!authenticated ? (
                <button
                  type="button"
                  onClick={login}
                  className="btn-primary w-full py-4 text-base font-heading font-bold shadow-lg"
                >
                  🔗 Connect Wallet to Pay
                </button>
              ) : paymentMethod === 'direct' ? (
                step === 'view' ? (
                  <button
                    type="button"
                    onClick={handleDirectPay}
                    className="btn-primary w-full py-4 text-base font-heading font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                  >
                    ⚡ Pay ${amount} USDC on Arc L1
                  </button>
                ) : step === 'approve' ? (
                  <button type="button" disabled className="btn-primary w-full py-4 text-base opacity-75 cursor-wait">
                    {isApproving ? '⏳ Approving USDC in Wallet...' : '⏳ Approve Token Allowance...'}
                  </button>
                ) : step === 'pay' ? (
                  <button
                    type="button"
                    onClick={handleConfirmPayOnChain}
                    disabled={isPaying || isConfirming}
                    className="btn-primary w-full py-4 text-base"
                  >
                    {isPaying ? '⏳ Confirming on-chain...' : isConfirming ? '⛓️ Settling on Arc...' : '✅ Complete Payment'}
                  </button>
                ) : null
              ) : paymentMethod === 'cctp' ? (
                <button
                  type="button"
                  onClick={handleBridgeAndPay}
                  disabled={bridgeStep !== 'idle'}
                  className="btn-primary w-full py-4 text-base font-heading font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                >
                  {bridgeStep !== 'idle' ? `⏳ Bridging (${bridgeStep})...` : `🌉 Bridge & Pay $${amount} USDC`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSwapAndPay}
                  disabled={isSwapping}
                  className="btn-primary w-full py-4 text-base font-heading font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  {isSwapping ? '🔄 Swapping & Settling...' : `🔄 Swap ${fromToken} → Pay $${amount} USDC`}
                </button>
              )}

              {/* Share & QR toggle button */}
              <button
                type="button"
                onClick={() => setShowQR(!showQR)}
                className="btn-secondary w-full text-xs py-3 flex items-center justify-center gap-2"
              >
                <span>{showQR ? 'Hide Sharing Options' : '📱 Share Payment Link / QR Code'}</span>
              </button>

              {showQR && (
                <div className="p-5 rounded-2xl bg-[var(--color-base)] border border-[var(--color-border)] flex flex-col items-center gap-4 animate-slide-up">
                  <div className="p-3.5 bg-white rounded-2xl shadow-xl">
                    <QRCodeSVG value={payUrl} size={170} />
                  </div>
                  <div className="w-full space-y-2">
                    <label className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">
                      Direct Checkout URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={payUrl}
                        className="input-field text-xs font-mono flex-1 text-zinc-300 py-2.5"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(payUrl, 'link')}
                        className="btn-secondary px-4 py-2.5 text-xs font-heading font-bold whitespace-nowrap"
                      >
                        {copiedLink ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
