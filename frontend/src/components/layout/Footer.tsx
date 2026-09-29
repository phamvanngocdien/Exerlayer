import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-base-elevated)]/60 backdrop-blur-xl mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-xs text-white">
                Ex
              </div>
              <span className="font-heading font-extrabold text-base tracking-tight text-white">
                Exerlayer
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Stablecoin-native invoicing &amp; autonomous AI agent treasury management, built natively on Arc L1.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Arc Testnet Chain ID 5042002</span>
            </div>
          </div>

          {/* Track 1: DeFi Infrastructure */}
          <div className="space-y-2 text-xs">
            <p className="font-heading font-bold text-white uppercase tracking-wider text-[11px]">
              Track 1: DeFi Infrastructure
            </p>
            <ul className="space-y-1.5 text-[var(--color-text-secondary)]">
              <li>• USDC-Native Gas &amp; Invoicing</li>
              <li>• Circle CCTP V2 Cross-Chain Bridge</li>
              <li>• Unified Balance Liquidity Aggregator</li>
              <li>• Instant Sub-Second Settlement</li>
            </ul>
          </div>

          {/* Track 2: Agentic Economy */}
          <div className="space-y-2 text-xs">
            <p className="font-heading font-bold text-white uppercase tracking-wider text-[11px]">
              Track 2: Agentic Economy
            </p>
            <ul className="space-y-1.5 text-[var(--color-text-secondary)]">
              <li>• Circle Agent MPC Autonomous Wallets</li>
              <li>• Guardrail Limits (Per-Invoice &amp; Daily)</li>
              <li>• Automated 6h Deep Reconciliation</li>
              <li>• Velocity Fraud &amp; Burst Detection</li>
            </ul>
          </div>

          {/* External Links */}
          <div className="space-y-2 text-xs">
            <p className="font-heading font-bold text-white uppercase tracking-wider text-[11px]">
              Ecosystem &amp; Resources
            </p>
            <ul className="space-y-1.5 text-[var(--color-text-secondary)]">
              <li>
                <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                  ArcScan Explorer ↗
                </a>
              </li>
              <li>
                <a href="https://developers.circle.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                  Circle Developer Docs ↗
                </a>
              </li>
              <li>
                <a href="https://faucet.testnet.arc.network" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                  Arc Testnet Faucet ↗
                </a>
              </li>
              <li>
                <Link href="/pay/demo" className="text-cyan-400 hover:underline">
                  Interactive Demo Checkout →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
          <p>© {new Date().getFullYear()} Exerlayer. Open source MIT License.</p>
          <p className="font-mono text-[11px]">Built on Arc L1 with sub-second finality.</p>
        </div>
      </div>
    </footer>
  );
}
