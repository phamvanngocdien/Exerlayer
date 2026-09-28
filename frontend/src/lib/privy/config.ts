import { arcTestnet } from '../wallet/config';

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cm00000000000000000000000',
  config: {
    loginMethods: ['email', 'wallet'] as ('email' | 'wallet')[],
    appearance: {
      theme: 'dark' as const,
      accentColor: '#3b82f6' as `#${string}`,
      logo: '/logo.svg',
    },
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'users-without-wallets' as const,
      },
    },
    defaultChain: arcTestnet,
    supportedChains: [arcTestnet],
  },
};
