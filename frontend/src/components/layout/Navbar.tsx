'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/invoices', label: 'Invoices', icon: '📄' },
  { href: '/invoices/new', label: 'Create Invoice', icon: '✨' },
  { href: '/dashboard', label: 'Treasury & AI', icon: '📊' },
];

export function Navbar() {
  const pathname = usePathname();
  const { authenticated, login, logout, shortenedAddress, formattedUsdcBalance } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-base)]/80 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Left: Brand Logo & Network Status */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                <div className="w-full h-full rounded-[11px] bg-[var(--color-base)] flex items-center justify-center font-extrabold text-base font-heading">
                  <span className="gradient-text font-black">Ex</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold font-heading tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  Exerlayer
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono -mt-1 tracking-wider uppercase">
                  Arc L1 • USDC Native
                </span>
              </div>
            </Link>

            {/* Network Badge */}
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono text-blue-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Arc Testnet</span>
              <span className="text-zinc-500">#5042002</span>
            </div>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-600/25 to-indigo-600/25 text-white border border-blue-500/35 shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Wallet, Balance & CTA */}
          <div className="flex items-center gap-3">
            {authenticated ? (
              <div className="flex items-center gap-2.5">
                {/* USDC Balance Chip */}
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium">
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">$</span>
                  <span className="font-mono text-white font-semibold">{formattedUsdcBalance}</span>
                  <span className="text-[var(--color-text-muted)] text-[10px]">USDC</span>
                </div>

                {/* User Address / Logout */}
                <button
                  onClick={logout}
                  title="Click to disconnect"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 transition-all text-xs font-mono group"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-red-400" />
                  <span className="text-[var(--color-text-secondary)] group-hover:text-red-300">
                    {shortenedAddress}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="btn-primary text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-xl"
              >
                <span>🔗</span>
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[var(--color-text-secondary)] hover:text-white"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-2 border-t border-[var(--color-border)] space-y-1 animate-fade-in">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.05]"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
