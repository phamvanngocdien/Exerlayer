-- Exerlayer Supabase PostgreSQL Cloud Database Schema
-- Execute this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  chain_invoice_id BIGINT UNIQUE NOT NULL,
  creator_address TEXT NOT NULL,
  payer_address TEXT,
  amount TEXT NOT NULL,
  due_date BIGINT NOT NULL,
  description TEXT,
  metadata_hash TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  paid_at BIGINT,
  paid_by TEXT,
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  log_index INT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- 3. Indexer State Table
CREATE TABLE IF NOT EXISTS indexer_state (
  id INT PRIMARY KEY DEFAULT 1,
  last_block BIGINT NOT NULL DEFAULT 0
);
INSERT INTO indexer_state (id, last_block) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  invoice_id BIGINT,
  details JSONB,
  resolved INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Agent Wallet Table
CREATE TABLE IF NOT EXISTS agent_wallet (
  id INT PRIMARY KEY DEFAULT 1,
  wallet_id TEXT NOT NULL,
  address TEXT NOT NULL,
  daily_spent TEXT DEFAULT '0',
  last_reset_date TEXT
);

-- 6. Agent Actions Table
CREATE TABLE IF NOT EXISTS agent_actions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  invoice_id BIGINT,
  tx_hash TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Autopay Settings Table
CREATE TABLE IF NOT EXISTS autopay_settings (
  creator_address TEXT PRIMARY KEY,
  enabled INT DEFAULT 0,
  max_amount TEXT DEFAULT '1000000000',
  daily_limit TEXT DEFAULT '5000000000',
  allowed_payers JSONB
);

-- Indexes for maximum query performance
CREATE INDEX IF NOT EXISTS idx_invoices_creator ON invoices(creator_address);
CREATE INDEX IF NOT EXISTS idx_invoices_payer ON invoices(payer_address);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_type ON agent_actions(type);
