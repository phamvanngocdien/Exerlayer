import { arcTestnet } from '../wallet/config';

const envAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const isValidFormat = Boolean(envAppId && envAppId.startsWith('c') && envAppId.length >= 20);

export const privyConfig = {
  appId: isValidFormat ? (envAppId as string) : 'cms1nlwri001z0ckswg4ms1t4',
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
