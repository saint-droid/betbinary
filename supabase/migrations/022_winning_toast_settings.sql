-- Winning toast / animated winnings settings
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS winning_toast_enabled          BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS winning_toast_interval_min_secs INT        NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS winning_toast_interval_max_secs INT        NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS winning_toast_real_win_pct      INT        NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS winning_toast_min_amount        INT        NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS winning_toast_max_amount        INT        NOT NULL DEFAULT 10000;
