-- Add site_id to trades if it doesn't exist (multi-tenant support)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS site_id TEXT;
CREATE INDEX IF NOT EXISTS idx_trades_site_id ON trades(site_id) WHERE site_id IS NOT NULL;
