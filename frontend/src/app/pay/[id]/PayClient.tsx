'use client';

import { use, useState, useEffect } from 'react';
import { useInvoiceById, usePayInvoice, useApproveUSDC } from '@/hooks/useInvoice';
import { useWallet } from '@/hooks/useWallet';
import { useAppKit, SUPPORTED_SOURCE_CHAINS } from '@/hooks/useAppKit';
import { getContractAddresses, isContractsConfigured } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/wallet/config';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_MAP: Record<number, { label: string; class: string; icon: string }> = {
  0: { label: 'Pending', class: 'badge-created', icon: '⏳' },
  1: { label: 'Paid', class: 'badge-paid', icon: '✅' },
  2: { label: 'Cancelled', class: 'badge-cancelled', icon: '❌' },
  3: { label: 'Overdue', class: 'badge-overdue', icon: '⚠️' },
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
    description: 'Q3 Cloud Infrastructure & Autonomous Agent Hosting Services',
    status: isSimulatedPaid ? 1 : 0,
    paidAt: isSimulatedPaid ? BigInt(Math.floor(Date.now() / 1000)) : BigInt(0),
    paidBy: isSimulatedPaid ? (userAddress || '0x71C...3aF') : '0x0000000000000000000000000000000000000000',
  };

  const invoice = onChainInvoice || (id === 'demo' || !contractsReady ? demoInvoice : null);
  const isLoading = isNumericId && contractsReady ? isOnChainLoading : false;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <div className="glass-card p-12 animate-pulse text-center">
          <div className="h-6 bg-[var(--color-surface)] rounded w-1/3 mx-auto mb-4" />
          <div className="h-10 bg-[var(--color-surface)] rounded w-1/2 mx-auto mb-6" />
          <div className="h-4 bg-[var(--color-surface)] rounded w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-12">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-xl font-bold mb-2">Invoice Not Found</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6">
            Invoice #{id} does not exist on-chain or network contracts are not yet configured.
          </p>
          <a href="/pay/demo" className="btn-primary inline-block">
            View Live Demo Invoice
          </a>
        </div>
      </div>
    );
  }

  const amount = (Number(invoice.amount) / 1e6).toFixed(2);
  const dueDate = new Date(Number(invoice.dueDate) * 1000);
  const isOverdue = invoice.status === 0 && dueDate < new Date();
  const statusKey = isOverdue ? 3 : invoice.status;
  const { label: statusLabel, class: statusClass, icon: statusIcon } = STATUS_MAP[statusKey] || STATUS_MAP[0];
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
      }, 1500);
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
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-12 animate-slide-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-[var(--color-success)]/20 flex items-center justify-center text-4xl mb-6 animate-pulse-glow">
            ✅
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Confirmed!</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Invoice #{id} — <span className="font-bold text-[var(--color-text-primary)]">${amount} USDC</span>
          </p>
          <div className="p-4 rounded-xl bg-[var(--color-base)] max-w-md mx-auto text-left text-xs space-y-2 mb-6 font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Settlement Layer:</span>
              <span className="text-[var(--color-success)] font-semibold">Arc L1 (Chain 5042002)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Method:</span>
              <span className="capitalize">{paymentMethod === 'direct' ? 'Direct USDC' : paymentMethod === 'cctp' ? 'Circle CCTP V2 Bridge' : 'DEX Swap & Pay'}</span>
            </div>
            {finalTxHash && (
              <div className="flex justify-between break-all">
                <span className="text-[var(--color-text-muted)]">Tx:</span>
                <span className="text-[var(--color-accent)]">{finalTxHash.slice(0, 16)}...{finalTxHash.slice(-8)}</span>
              </div>
            )}
          </div>
          {finalTxHash && (
            <a
              href={`https://testnet.arcscan.app/tx/${finalTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-accent)] hover:underline block mb-6"
            >
              View on ArcScan Explorer →
            </a>
          )}
          <a href="/invoices" className="btn-secondary px-6 py-2.5 inline-block text-sm">
            ← Return to Invoices
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Notice banner if in demo mode */}
      {!contractsReady && (
        <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
          <span>⚡ Live Interactive Mode — Test direct payment, CCTP cross-chain bridge & swap.</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-[10px] font-mono">TESTNET</span>
        </div>
      )}

      <div className="glass-card p-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] font-mono mb-1">INVOICE</p>
            <p className="text-sm text-[var(--color-text-secondary)]">#{id}</p>
          </div>
          <span className={`badge ${statusClass}`}>{statusIcon} {statusLabel}</span>
        </div>

        {/* Amount */}
        <div className="text-center py-8 border-y border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Amount Due</p>
          <p className="text-5xl font-extrabold gradient-text">${amount}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">USDC</p>
        </div>

        {/* Details */}
        <div className="space-y-4 py-6">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">From</span>
            <span className="font-mono">{shortenAddr(invoice.creator)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">To</span>
            <span className="font-mono">
              {invoice.payer === '0x0000000000000000000000000000000000000000' ? 'Anyone (Open)' : shortenAddr(invoice.payer)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Due Date</span>
            <span>{dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString()}</span>
          </div>
          {invoice.description && (
            <div className="pt-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Description</p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{invoice.description}</p>
            </div>
          )}
        </div>

        {invoice.status === 0 && (
          <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
            {/* Payment Method Selector */}
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                Choose Payment Route
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('direct')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    paymentMethod === 'direct'
                      ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <p className="font-bold text-sm mb-0.5">⚡ Direct</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">USDC on Arc</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cctp')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    paymentMethod === 'cctp'
                      ? 'bg-violet-500/15 border-violet-500 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <p className="font-bold text-sm mb-0.5">🌉 Bridge</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Circle CCTP V2</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('swap')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    paymentMethod === 'swap'
                      ? 'bg-emerald-500/15 border-emerald-500 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <p className="font-bold text-sm mb-0.5">🔄 Swap</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Any Token → USDC</p>
                </button>
              </div>
            </div>

            {/* Method Details */}
            {paymentMethod === 'direct' && (
              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Network:</span>
                  <span className="font-semibold">Arc Testnet (Chain ID 5042002)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Settlement Time:</span>
                  <span className="text-[var(--color-success)] font-semibold">&lt; 1 second (Native USDC)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Gas Asset:</span>
                  <span>USDC (No ETH needed)</span>
                </div>
              </div>
            )}

            {paymentMethod === 'cctp' && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--color-text-muted)] mb-1 font-semibold">
                    Select Source Chain:
                  </label>
                  <select
                    value={selectedChainId}
                    onChange={(e) => setSelectedChainId(Number(e.target.value))}
                    className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  >
                    {SUPPORTED_SOURCE_CHAINS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name} — Balance: ${c.usdcBalance} USDC
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
                  <div className="flex justify-between">
                    <span>Protocol:</span>
                    <span className="font-mono text-violet-400">Circle CCTP V2 (Burn &amp; Mint)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slippage:</span>
                    <span className="text-[var(--color-success)]">0.00% (1:1 Peg Guaranteed)</span>
                  </div>
                </div>

                {bridgeStep !== 'idle' && (
                  <div className="p-3 rounded-lg bg-[var(--color-base)] border border-[var(--color-border)] space-y-1">
                    <p className="font-semibold text-xs text-[var(--color-accent)] capitalize">
                      Status: {bridgeStep}...
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {bridgeStep === 'approving' && '1/4 Approving USDC on source chain...'}
                      {bridgeStep === 'burning' && '2/4 Executing depositForBurn transaction...'}
                      {bridgeStep === 'attesting' && '3/4 Fetching Circle Iris off-chain attestation...'}
                      {bridgeStep === 'minting' && '4/4 Minting native USDC on Arc L1...'}
                    </p>
                  </div>
                )}
                {bridgeError && <p className="text-red-400 text-xs">{bridgeError}</p>}
              </div>
            )}

            {paymentMethod === 'swap' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFromToken('ETH')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs ${
                      fromToken === 'ETH' ? 'border-emerald-500 bg-emerald-500/20 font-bold' : 'border-[var(--color-border)]'
                    }`}
                  >
                    Pay with ETH
                  </button>
                  <button
                    type="button"
                    onClick={() => setFromToken('USDT')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs ${
                      fromToken === 'USDT' ? 'border-emerald-500 bg-emerald-500/20 font-bold' : 'border-[var(--color-border)]'
                    }`}
                  >
                    Pay with USDT
                  </button>
                </div>
                <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
                  <span>Estimated Rate:</span>
                  <span>{fromToken === 'ETH' ? `~${(Number(amount) / 3200).toFixed(4)} ETH` : `~${amount} USDT`}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!authenticated ? (
              <button onClick={login} className="btn-primary w-full py-4 text-base">
                🔗 Connect Wallet to Pay
              </button>
            ) : paymentMethod === 'direct' ? (
              step === 'view' ? (
                <button onClick={handleDirectPay} className="btn-primary w-full py-4 text-base">
                  💰 Pay ${amount} USDC on Arc
                </button>
              ) : step === 'approve' ? (
                <button disabled className="btn-primary w-full py-4 text-base">
                  {isApproving ? '⏳ Approving USDC...' : '⏳ Approve in wallet...'}
                </button>
              ) : step === 'pay' ? (
                <button
                  onClick={handleConfirmPayOnChain}
                  disabled={isPaying || isConfirming}
                  className="btn-primary w-full py-4 text-base"
                >
                  {isPaying ? '⏳ Confirm payment...' : isConfirming ? '⛓️ Confirming...' : '✅ Confirm Payment'}
                </button>
              ) : null
            ) : paymentMethod === 'cctp' ? (
              <button
                onClick={handleBridgeAndPay}
                disabled={bridgeStep !== 'idle'}
                className="btn-primary w-full py-4 text-base bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
              >
                {bridgeStep !== 'idle' ? `⏳ Bridging (${bridgeStep})...` : `🌉 Bridge & Pay $${amount} USDC`}
              </button>
            ) : (
              <button
                onClick={handleSwapAndPay}
                disabled={isSwapping}
                className="btn-primary w-full py-4 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              >
                {isSwapping ? '🔄 Swapping & Paying...' : `🔄 Swap ${fromToken} → Pay $${amount} USDC`}
              </button>
            )}

            <button onClick={() => setShowQR(!showQR)} className="btn-secondary w-full text-sm">
              {showQR ? 'Hide QR Code' : '📱 Share Payment Link / QR'}
            </button>

            {showQR && (
              <div className="flex flex-col items-center gap-4 pt-4 animate-fade-in">
                <div className="p-4 bg-white rounded-2xl shadow-xl">
                  <QRCodeSVG value={payUrl} size={180} />
                </div>
                <div className="flex items-center gap-2 w-full">
                  <input readOnly value={payUrl} className="input-field text-xs font-mono flex-1" />
                  <button onClick={() => navigator.clipboard.writeText(payUrl)} className="btn-secondary px-4 py-3 text-sm">
                    📋 Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
