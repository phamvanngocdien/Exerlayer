# 🏗️ Exerlayer — On-Chain Invoice Payments on Arc

> Stablecoin-native invoicing & autonomous AI agent treasury management, built on Arc L1.

**Live Demo**: [exerlayer.vercel.app](https://exerlayer.vercel.app) | **Network**: Arc Testnet (Chain ID 5042002)

---

## 🎯 What is Exerlayer?

Exerlayer is an **on-chain invoice payment platform** that bridges DeFi infrastructure with autonomous AI agents. Create invoices, pay in USDC, and let AI agents manage your accounts payable — all with sub-second settlement on Arc L1.

### Track 1: DeFi — Stablecoin-Native Fintech Infrastructure

- **USDC Payments**: Create invoices denominated in USDC on Arc. Gas fees in USDC too — no ETH needed.
- **Cross-Chain Bridge**: Pay invoices using USDC from any chain via Circle App Kit Bridge (CCTP V2).
- **Swap Integration**: Convert any token → USDC → pay invoice in a single flow.
- **Unified Balance**: Aggregate USDC across all chains for optimal payment routing.
- **Compliance Rules**: On-chain whitelist/blacklist and threshold checks before large payments.
- **Treasury Dashboard**: Real-time stats, cash flow overview, and payment analytics.

### Track 2: Agentic Economy — Autonomous AI Agent

- **Agent Wallets (MPC)**: AI agent holds its own wallet, funded with USDC, using Circle Agent Stack.
- **Autopay**: Agent autonomously pays due invoices — **no human in the loop**.
- **Fraud Detection**: Rule-based detection of duplicates, anomalies, and suspicious burst patterns.
- **Reconciliation**: Automated duplicate detection and amount anomaly flagging.
- **Guardrails**: Per-invoice limits, daily spending caps, and authorized contract restrictions.
- **Audit Trail**: Every autonomous action logged for transparency and compliance.

---

## 🏛️ Architecture

```
┌──────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│   Next.js dApp   │    │    Backend API     │    │  Arc Testnet     │
│   (frontend/)    │◄──►│    (backend/)      │◄──►│  (contracts/)    │
│                  │    │                    │    │                  │
│  • Privy Auth    │    │  • REST API        │    │  • Invoice.sol   │
│  • wagmi/viem    │    │  • Supabase Cloud  │    │  • Router.sol    │
│  • App Kit       │    │  • Event Indexer   │    │  • Compliance    │
│  • QR Payment    │    │  • AI Agent Engine │    │  • USDC          │
└──────────────────┘    └────────────────────┘    └──────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Blockchain | Arc Testnet (Chain 5042002) | Free |
| Stablecoin | USDC on Arc | Testnet tokens |
| App Kits | `@circle-fin/app-kit` + `adapter-viem-v2` | Sandbox free |
| Agent Stack | Circle Agent Wallets (MPC) + x402 | 1K MAW free |
| Smart Contracts | Solidity 0.8.26 + Foundry | Open source |
| Frontend | Next.js 15 + Tailwind + Privy + wagmi | Vercel Hobby |
| Backend & Agent | Node/Hono + Cloudflare Worker | 100K req/day |
| Cloud Database | Supabase (PostgreSQL Cloud) + Cloudflare D1 | Free |
| AI/NLP | Workers AI (Llama 3.1 8B) | 10K neurons/day |

**Total cost: $0**

---

## 🚀 Environment Setup (`.env`) & Quick Start

Every module comes with structured `.env` and `.env.example` configurations.

### 1. Smart Contracts (`contracts/`)

```bash
# Option A: One-click deployment with Node.js & viem (No Foundry installation required)
# 1. Fill your PRIVATE_KEY in contracts/.env
node contracts/deploy.mjs

# Option B: Foundry script (if Foundry is installed)
cd contracts
forge build
forge test -vvv
forge script script/Deploy.s.sol --rpc-url $ARC_TESTNET_RPC --broadcast
```

### 2. Backend & Agent Engine (`backend/`)

```bash
cd backend
# Copy .env configuration
cp .env.example .env

npm install

# Option A: Supabase Cloud Database (PostgreSQL)
# Execute backend/src/db/supabase-schema.sql in Supabase SQL Editor

# Option B: Local D1 SQLite Migration
npm run db:migrate:local

# Start backend server
npm run dev
# API running at http://localhost:8787
```

### 3. Frontend (`frontend/`)

```bash
cd frontend
# Copy .env configuration
cp .env.example .env

npm install
npm run dev
# Open http://localhost:3000
```

---

## 📄 Smart Contracts

| Contract | Description |
|---|---|
| `Invoice.sol` | Invoice lifecycle: create, pay, cancel. Indexed events for off-chain sync. |
| `PaymentRouter.sol` | Routes payments through compliance, supports batch and agent autopay. |
| `ComplianceRules.sol` | On-chain whitelist/blacklist + large payment threshold enforcement. |

---

## 🤖 AI Agent Details

The autonomous agent runs via background triggers:

| Schedule | Task | Description |
|---|---|---|
| Every 1 min | `indexEvents` | Polls on-chain events into Supabase Cloud DB & D1 |
| Daily 9 AM | `agentTasks` | Reminders, overdue marking, autopay, fraud check |
| Every 6 hours | `runReconcile` | Deep duplicate and anomaly detection |

---

## 📁 Project Structure

```
exerlayer/
├── contracts/          # Solidity (Foundry) — Invoice, Router, Compliance (.env included)
├── frontend/           # Next.js 15 — Privy, wagmi, App Kit (.env included)
├── backend/            # Express/Hono Backend & Agent Engine (.env included)
│   └── src/db/         # Supabase PostgreSQL schema & D1 SQLite schema
├── docs/               # Architecture and deployment docs
└── .github/workflows/  # CI pipeline
```

---

## 📜 License

MIT
