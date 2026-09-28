-- Exerlayer D1 Schema (SQLite)
-- Cloudflare D1 free tier: 5GB storage, 5M reads/day, 100K writes/day

-- Invoices (synced from on-chain events)
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_invoice_id INTEGER UNIQUE NOT NULL,
  creator_address TEXT NOT NULL,
  payer_address TEXT,
  amount TEXT NOT NULL,
  due_date INTEGER NOT NULL,
  description TEXT,
  metadata_hash TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  paid_at INTEGER,
  paid_by TEXT,
  tx_hash TEXT,
  block_number INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- On-chain events log
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  log_index INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(tx_hash, log_index)
);

-- Indexer state
CREATE TABLE IF NOT EXISTS indexer_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_block INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO indexer_state (id, last_block) VALUES (1, 0);

-- Agent alerts
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  invoice_id INTEGER,
  details TEXT,
  resolved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Agent wallet state
CREATE TABLE IF NOT EXISTS agent_wallet (
  id INTEGER PRIMARY KEY DEFAULT 1,
  wallet_id TEXT NOT NULL,
  address TEXT NOT NULL,
  daily_spent TEXT DEFAULT '0',
  last_reset_date TEXT
);

-- Agent action log (audit trail)
CREATE TABLE IF NOT EXISTS agent_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  invoice_id INTEGER,
  tx_hash TEXT,
  details TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Autopay settings per creator
CREATE TABLE IF NOT EXISTS autopay_settings (
  creator_address TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  max_amount TEXT DEFAULT '1000000000',
  daily_limit TEXT DEFAULT '5000000000',
  allowed_payers TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_creator ON invoices(creator_address);
CREATE INDEX IF NOT EXISTS idx_invoices_payer ON invoices(payer_address);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_type ON agent_actions(type);
