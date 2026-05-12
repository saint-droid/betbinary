-- Add tick-based trade duration control
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS trade_ticks INTEGER NOT NULL DEFAULT 2;
