'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';

const NAV_ITEMS = [
  { href: '/invoices', label: 'Invoices', icon: '📄' },
  { href: '/invoices/new', label: 'Create', icon: '✨' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
];

export function Navbar() {
  const pathname = usePathname();
  const { authenticated, login, logout, shortenedAddress, formattedUsdcBalance } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-base)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all">
              Ex
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">
              Exerlayer
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                    }
                  `}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {authenticated ? (
              <div className="flex items-center gap-3">
                {/* USDC Balance */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">$</div>
                  <span className="text-sm font-medium">{formattedUsdcBalance} USDC</span>
                </div>

                {/* Address + Logout */}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                  <span className="font-mono text-[var(--color-text-secondary)]">
                    {shortenedAddress}
                  </span>
                </button>
              </div>
            ) : (
              <button onClick={login} className="btn-primary text-sm px-5 py-2">
                Connect Wallet
              </button>
            )}

            {/* Mobile menu */}
            <div className="md:hidden flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-2 text-lg"
                  title={item.label}
                >
                  {item.icon}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
