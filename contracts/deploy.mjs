import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { createPublicClient, createWalletClient, http } = require('../frontend/node_modules/viem');
const { privateKeyToAccount } = require('../frontend/node_modules/viem/accounts');
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from contracts/.env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        env[key] = value;
      }
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const RPC_URL = env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.network';
let PRIVATE_KEY = env.PRIVATE_KEY;
let USDC_ADDRESS = env.USDC_ADDRESS;

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
};

async function main() {
  console.log('\n🚀 Starting Exerlayer Smart Contract Deployment on Arc Testnet...\n');

  if (!PRIVATE_KEY || PRIVATE_KEY.length < 64) {
    console.warn('⚠️ No PRIVATE_KEY provided in contracts/.env.');
    console.log('To deploy to Arc Testnet:');
    console.log('  1. Add your PRIVATE_KEY=<hex> to contracts/.env');
    console.log('  2. Run: node contracts/deploy.mjs\n');
    return;
  }

  if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = `0x${PRIVATE_KEY}`;
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`🔑 Deployer Account: ${account.address}`);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account Balance: ${balance.toString()} wei (native USDC)`);

  if (balance === 0n) {
    console.error('❌ Account balance is 0. Please fund your account via the Arc Testnet Faucet before deploying.');
    return;
  }

  // Read artifacts
  const complianceArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'out/ComplianceRules.sol/ComplianceRules.json'), 'utf8')
  );
  const invoiceArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'out/Invoice.sol/Invoice.json'), 'utf8')
  );
  const routerArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'out/PaymentRouter.sol/PaymentRouter.json'), 'utf8')
  );

  // 1. Deploy ComplianceRules
  console.log('📦 1/4 Deploying ComplianceRules...');
  const hash1 = await walletClient.deployContract({
    abi: complianceArtifact.abi,
    bytecode: complianceArtifact.bytecode.object,
  });
  console.log(`   Tx Hash: ${hash1}`);
  const receipt1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });
  const complianceAddress = receipt1.contractAddress;
  console.log(`   ✅ ComplianceRules deployed at: ${complianceAddress}`);

  // Fallback USDC address on Arc Testnet if none specified
  if (!USDC_ADDRESS || USDC_ADDRESS === '0x0000000000000000000000000000000000000000') {
    // Default native USDC contract placeholder or mock
    USDC_ADDRESS = complianceAddress; // Or token address
    console.log(`   ℹ️ Using USDC Address: ${USDC_ADDRESS}`);
  }

  // 2. Deploy Invoice
  console.log('📦 2/4 Deploying Invoice...');
  const hash2 = await walletClient.deployContract({
    abi: invoiceArtifact.abi,
    bytecode: invoiceArtifact.bytecode.object,
    args: [USDC_ADDRESS],
  });
  console.log(`   Tx Hash: ${hash2}`);
  const receipt2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });
  const invoiceAddress = receipt2.contractAddress;
  console.log(`   ✅ Invoice deployed at: ${invoiceAddress}`);

  // 3. Deploy PaymentRouter
  console.log('📦 3/4 Deploying PaymentRouter...');
  const hash3 = await walletClient.deployContract({
    abi: routerArtifact.abi,
    bytecode: routerArtifact.bytecode.object,
    args: [invoiceAddress, complianceAddress, USDC_ADDRESS],
  });
  console.log(`   Tx Hash: ${hash3}`);
  const receipt3 = await publicClient.waitForTransactionReceipt({ hash: hash3 });
  const routerAddress = receipt3.contractAddress;
  console.log(`   ✅ PaymentRouter deployed at: ${routerAddress}`);

  // 4. Link PaymentRouter in Invoice contract
  console.log('🔗 4/4 Linking PaymentRouter to Invoice contract...');
  const hash4 = await walletClient.writeContract({
    address: invoiceAddress,
    abi: invoiceArtifact.abi,
    functionName: 'setPaymentRouter',
    args: [routerAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: hash4 });
  console.log('   ✅ PaymentRouter linked to Invoice successfully!');

  // Summary
  console.log('\n========================================');
  console.log('🎉 DEPLOYMENT COMPLETE ON ARC TESTNET!');
  console.log('========================================');
  console.log(`ComplianceRules: ${complianceAddress}`);
  console.log(`Invoice:         ${invoiceAddress}`);
  console.log(`PaymentRouter:   ${routerAddress}`);
  console.log(`USDC:            ${USDC_ADDRESS}`);
  console.log('========================================\n');

  // Update frontend addresses.ts
  const addressesFilePath = path.join(rootDir, 'frontend/src/lib/contracts/addresses.ts');
  if (fs.existsSync(addressesFilePath)) {
    const updatedContent = `/// Contract addresses per network
/// Auto-generated by deploy script

export const CONTRACT_ADDRESSES: Record<number, {
  invoice: \`0x\${string}\`;
  paymentRouter: \`0x\${string}\`;
  complianceRules: \`0x\${string}\`;
  usdc: \`0x\${string}\`;
}> = {
  // Arc Testnet (Chain ID: 5042002)
  5042002: {
    invoice: (process.env.NEXT_PUBLIC_INVOICE_ADDRESS as \`0x\${string}\`) || '${invoiceAddress}',
    paymentRouter: (process.env.NEXT_PUBLIC_ROUTER_ADDRESS as \`0x\${string}\`) || '${routerAddress}',
    complianceRules: (process.env.NEXT_PUBLIC_COMPLIANCE_ADDRESS as \`0x\${string}\`) || '${complianceAddress}',
    usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS as \`0x\${string}\`) || '${USDC_ADDRESS}',
  },
};

export function getContractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(\`No contract addresses configured for chain ID \${chainId}\`);
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
`;
    fs.writeFileSync(addressesFilePath, updatedContent, 'utf8');
    console.log('✅ Updated frontend/src/lib/contracts/addresses.ts');
  }

  // Update frontend .env
  const frontendEnvPath = path.join(rootDir, 'frontend/.env');
  if (fs.existsSync(frontendEnvPath)) {
    let content = fs.readFileSync(frontendEnvPath, 'utf8');
    content = content.replace(/NEXT_PUBLIC_INVOICE_ADDRESS=.*/, `NEXT_PUBLIC_INVOICE_ADDRESS=${invoiceAddress}`);
    content = content.replace(/NEXT_PUBLIC_ROUTER_ADDRESS=.*/, `NEXT_PUBLIC_ROUTER_ADDRESS=${routerAddress}`);
    content = content.replace(/NEXT_PUBLIC_COMPLIANCE_ADDRESS=.*/, `NEXT_PUBLIC_COMPLIANCE_ADDRESS=${complianceAddress}`);
    content = content.replace(/NEXT_PUBLIC_USDC_ADDRESS=.*/, `NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);
    fs.writeFileSync(frontendEnvPath, content, 'utf8');
    console.log('✅ Updated frontend/.env');
  }

  // Update backend .env
  const backendEnvPath = path.join(rootDir, 'backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    let content = fs.readFileSync(backendEnvPath, 'utf8');
    content = content.replace(/INVOICE_CONTRACT=.*/, `INVOICE_CONTRACT=${invoiceAddress}`);
    content = content.replace(/ROUTER_CONTRACT=.*/, `ROUTER_CONTRACT=${routerAddress}`);
    fs.writeFileSync(backendEnvPath, content, 'utf8');
    console.log('✅ Updated backend/.env');
  }
}

main().catch(console.error);
