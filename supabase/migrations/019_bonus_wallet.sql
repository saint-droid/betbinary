-- Separate bonus wallet: locked until trades_required completed, expires after bonus_expiry_hours

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bonus_balance_usd     DECIMAL(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_trades_remaining INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_expires_at       TIMESTAMPTZ;

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS welcome_bonus_trades_required INT  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS welcome_bonus_expiry_hours    INT  NOT NULL DEFAULT 4;

-- Function to expire bonuses that have passed their deadline
CREATE OR REPLACE FUNCTION fn_expire_bonuses() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users
  SET bonus_balance_usd = 0, bonus_trades_remaining = 0, bonus_expires_at = NULL
  WHERE bonus_expires_at IS NOT NULL
    AND bonus_expires_at < NOW()
    AND bonus_balance_usd > 0;
END;
$$;
