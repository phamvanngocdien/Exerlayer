# Exerlayer Architecture

## System Overview

Exerlayer is a monorepo with three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vercel)                        │
│  Next.js 15 + Privy Auth + wagmi/viem + Circle App Kit          │
│  Routes: / | /invoices | /invoices/new | /pay/[id] | /dashboard │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API + on-chain RPC
┌────────────────────▼────────────────────────────────────────────┐
│                  Worker (Cloudflare Workers)                     │
│  Hono REST API + D1 SQLite + Cron Triggers + Workers AI          │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐       │
│  │ API Routes  │  │ Event Indexer│  │ AI Agent           │       │
│  │ /invoices   │  │ (1 min cron) │  │ ├── Autopay        │       │
│  │ /dashboard  │  │ getLogs poll │  │ ├── Reconcile      │       │
│  │ /agent      │  │ → D1 sync   │  │ ├── Fraud Check    │       │
│  └─────────────┘  └──────────────┘  │ ├── Agent Wallet   │       │
│                                      │ └── Workers AI     │       │
│                                      └───────────────────┘       │
└────────────────────┬─────────────────────────────────────────────┘
                     │ JSON-RPC (viem)
┌────────────────────▼────────────────────────────────────────────┐
│                    Arc Testnet (Chain 5042002)                   │
│                                                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Invoice.sol  │  │ PaymentRouter   │  │ ComplianceRules  │   │
│  │              │  │                 │  │                  │   │
│  │ create()     │──│ routePayment()  │──│ prePaymentCheck()│   │
│  │ pay()        │  │ routeBatch()    │  │ whitelist        │   │
│  │ cancel()     │  │ agentPay()      │  │ blacklist        │   │
│  └──────────────┘  └─────────────────┘  └──────────────────┘   │
│                           │                                     │
│                     ┌─────▼──────┐                              │
│                     │   USDC     │                              │
│                     │ (native)   │                              │
│                     └────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Invoice Creation
1. User fills form in frontend
2. Frontend calls `Invoice.createInvoice()` via wagmi
3. Arc processes tx (sub-second finality)
4. Worker indexer picks up `InvoiceCreated` event → stores in D1

### Invoice Payment
1. Payer opens `/pay/[id]` or scans QR
2. Frontend shows payment options:
   - Direct USDC on Arc
   - Bridge from another chain (App Kit)
   - Swap token → USDC (App Kit)
3. Payer approves USDC, then calls `Invoice.payInvoice()` or `PaymentRouter.routePayment()`
4. Compliance check → USDC transfer → state update
5. Worker indexer picks up `InvoicePaid` event → updates D1

### Agent Autopay (Agentic Economy)
1. Creator enables autopay in settings
2. Daily cron trigger fires at 9 AM
3. Agent queries D1 for due invoices with autopay enabled
4. Agent checks guardrails (per-invoice limit, daily cap)
5. Agent wallet (MPC) signs and sends `PaymentRouter.agentPayInvoice()`
6. Action logged in `agent_actions` table
7. No human intervention required

## Security Model

- **On-chain**: ReentrancyGuard, ComplianceRules (whitelist/blacklist/threshold)
- **Agent**: Per-invoice limits, daily spending cap, authorized contracts only
- **Auth**: Privy (email or wallet), embedded wallet with Arc chain
- **API**: CORS restricted, D1 (SQLite) prevents SQL injection via prepared statements
