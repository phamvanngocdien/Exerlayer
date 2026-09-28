'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance } from 'wagmi';
import { getContractAddresses } from '@/lib/contracts/addresses';
import { ERC20ABI } from '@/lib/contracts/abis';
import { useReadContract } from 'wagmi';
import { arcTestnet } from '@/lib/wallet/config';

export function useWallet() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { address, isConnected, chain } = useAccount();

  // Native balance (USDC on Arc)
  const { data: nativeBalance } = useBalance({
    address,
    chainId: arcTestnet.id,
  });

  // USDC token balance
  const addresses = (() => {
    try {
      return getContractAddresses(arcTestnet.id);
    } catch {
      return null;
    }
  })();

  const { data: usdcBalance } = useReadContract({
    address: addresses?.usdc,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address && !!addresses?.usdc },
  });

  const formattedUsdcBalance = usdcBalance
    ? (Number(usdcBalance) / 1e6).toFixed(2)
    : '0.00';

  const shortenedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  return {
    // Privy auth
    login,
    logout,
    authenticated,
    user,
    ready,
    // Wagmi wallet
    address,
    isConnected,
    chain,
    // Balances
    nativeBalance,
    usdcBalance,
    formattedUsdcBalance,
    // Helpers
    shortenedAddress,
  };
}
