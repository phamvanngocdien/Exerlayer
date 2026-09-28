/// Contract addresses per network
/// Supports environment variables or default configured addresses

export const CONTRACT_ADDRESSES: Record<number, {
  invoice: `0x${string}`;
  paymentRouter: `0x${string}`;
  complianceRules: `0x${string}`;
  usdc: `0x${string}`;
}> = {
  // Arc Testnet (Chain ID: 5042002)
  5042002: {
    invoice: (process.env.NEXT_PUBLIC_INVOICE_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    paymentRouter: (process.env.NEXT_PUBLIC_ROUTER_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    complianceRules: (process.env.NEXT_PUBLIC_COMPLIANCE_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000',
  },
};

export function getContractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`No contract addresses configured for chain ID ${chainId}`);
  }
  return addresses;
}

export function isContractsConfigured(chainId: number): boolean {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) return false;
  return (
    addresses.invoice !== '0x0000000000000000000000000000000000000000' &&
    addresses.invoice !== undefined
  );
}
