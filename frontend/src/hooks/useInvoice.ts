'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { InvoiceABI, ERC20ABI } from '@/lib/contracts/abis';
import { getContractAddresses } from '@/lib/contracts/addresses';
import { arcTestnet } from '@/lib/wallet/config';

const chainId = arcTestnet.id;

function useAddresses() {
  try {
    return getContractAddresses(chainId);
  } catch {
    return null;
  }
}

// ─── Read Hooks ──────────────────────────────────────────────────

export function useInvoiceById(invoiceId: bigint | undefined) {
  const addresses = useAddresses();

  return useReadContract({
    address: addresses?.invoice,
    abi: InvoiceABI,
    functionName: 'getInvoice',
    args: invoiceId !== undefined ? [invoiceId] : undefined,
    chainId,
    query: { enabled: invoiceId !== undefined && !!addresses },
  });
}

export function useInvoicesByCreator(creator: `0x${string}` | undefined) {
  const addresses = useAddresses();

  return useReadContract({
    address: addresses?.invoice,
    abi: InvoiceABI,
    functionName: 'getInvoicesByCreator',
    args: creator ? [creator] : undefined,
    chainId,
    query: { enabled: !!creator && !!addresses },
  });
}

export function useInvoiceCount() {
  const addresses = useAddresses();

  return useReadContract({
    address: addresses?.invoice,
    abi: InvoiceABI,
    functionName: 'getInvoiceCount',
    chainId,
    query: { enabled: !!addresses },
  });
}

// ─── Write Hooks ─────────────────────────────────────────────────

export function useCreateInvoice() {
  const addresses = useAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createInvoice = async (params: {
    payer: `0x${string}`;
    amount: string; // human readable, e.g. "100.50"
    dueDate: Date;
    description: string;
    metadataHash?: `0x${string}`;
  }) => {
    if (!addresses) throw new Error('Contracts not configured');

    const amountWei = parseUnits(params.amount, 6);
    const dueDateUnix = BigInt(Math.floor(params.dueDate.getTime() / 1000));
    const metadataHash = params.metadataHash || ('0x' + '0'.repeat(64)) as `0x${string}`;

    writeContract({
      address: addresses.invoice,
      abi: InvoiceABI,
      functionName: 'createInvoice',
      args: [params.payer, amountWei, dueDateUnix, params.description, metadataHash],
      chainId,
    });
  };

  return { createInvoice, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveUSDC() {
  const addresses = useAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = async (spender: `0x${string}`, amount: string) => {
    if (!addresses) throw new Error('Contracts not configured');

    writeContract({
      address: addresses.usdc,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [spender, parseUnits(amount, 6)],
      chainId,
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function usePayInvoice() {
  const addresses = useAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const payInvoice = async (invoiceId: bigint) => {
    if (!addresses) throw new Error('Contracts not configured');

    writeContract({
      address: addresses.invoice,
      abi: InvoiceABI,
      functionName: 'payInvoice',
      args: [invoiceId],
      chainId,
    });
  };

  return { payInvoice, hash, isPending, isConfirming, isSuccess, error };
}
