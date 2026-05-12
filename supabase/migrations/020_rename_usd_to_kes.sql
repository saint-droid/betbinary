-- Rename all _usd balance/amount columns to _kes and convert stored values
-- Conversion: multiply USD values by the current conversion_rate (stored in platform_settings)
-- All monetary storage is now in KES only

DO $$
DECLARE rate DECIMAL := (SELECT conversion_rate FROM platform_settings WHERE id = 1);
BEGIN

  -- ── users ──────────────────────────────────────────────────────
  ALTER TABLE users
    RENAME COLUMN balance_usd           TO balance_kes;
  ALTER TABLE users
    RENAME COLUMN affiliate_balance_usd TO affiliate_balance_kes;
  ALTER TABLE users
    RENAME COLUMN bonus_balance_usd     TO bonus_balance_kes;

  -- Convert stored USD → KES
  UPDATE users SET
    balance_kes           = balance_kes           * rate,
    affiliate_balance_kes = affiliate_balance_kes * rate,
    bonus_balance_kes     = bonus_balance_kes     * rate;

  -- Remove old USD check constraints and add KES ones
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_balance_usd_check;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_affiliate_balance_usd_check;
  ALTER TABLE users ADD CONSTRAINT users_balance_kes_check           CHECK (balance_kes >= 0);
  ALTER TABLE users ADD CONSTRAINT users_affiliate_balance_kes_check CHECK (affiliate_balance_kes >= 0);

  -- ── deposits ───────────────────────────────────────────────────
  ALTER TABLE deposits RENAME COLUMN amount_usd       TO amount_kes_calc;
  ALTER TABLE deposits RENAME COLUMN bonus_amount_usd TO bonus_amount_kes;
  -- amount_kes_calc is now redundant (amount_kes already exists), drop it
  -- Actually keep it renamed so nothing breaks — we'll use amount_kes going forward
  -- Convert bonus_amount_kes
  UPDATE deposits SET bonus_amount_kes = bonus_amount_kes * rate;

  -- ── withdrawals ────────────────────────────────────────────────
  ALTER TABLE withdrawals RENAME COLUMN amount_usd TO amount_kes_calc;
  UPDATE withdrawals SET amount_kes_calc = amount_kes_calc * rate;

  -- ── trades ─────────────────────────────────────────────────────
  ALTER TABLE trades RENAME COLUMN amount_usd TO amount_kes_trade;
  ALTER TABLE trades RENAME COLUMN payout_usd TO payout_kes;
  UPDATE trades SET
    amount_kes_trade = amount_kes_trade * rate,
    payout_kes       = payout_kes       * rate;

  -- ── referral_commissions ───────────────────────────────────────
  ALTER TABLE referral_commissions RENAME COLUMN amount_usd TO amount_kes;
  UPDATE referral_commissions SET amount_kes = amount_kes * rate;

END $$;

-- Update fn_credit_balance to use balance_kes
CREATE OR REPLACE FUNCTION fn_credit_balance(
  p_user_id UUID,
  p_amount  DECIMAL,
  p_is_demo BOOLEAN DEFAULT FALSE
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_is_demo THEN
    UPDATE users SET demo_balance = demo_balance + p_amount WHERE id = p_user_id;
  ELSE
    UPDATE users SET balance_kes = balance_kes + p_amount WHERE id = p_user_id;
  END IF;
END;
$$;

-- Update fn_debit_balance to use balance_kes
CREATE OR REPLACE FUNCTION fn_debit_balance(
  p_user_id UUID,
  p_amount  DECIMAL,
  p_is_demo BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_balance DECIMAL;
BEGIN
  IF p_is_demo THEN
    SELECT demo_balance INTO v_balance FROM users WHERE id = p_user_id;
    IF v_balance < p_amount THEN RETURN FALSE; END IF;
    UPDATE users SET demo_balance = demo_balance - p_amount WHERE id = p_user_id;
  ELSE
    SELECT balance_kes INTO v_balance FROM users WHERE id = p_user_id;
    IF v_balance < p_amount THEN RETURN FALSE; END IF;
    UPDATE users SET balance_kes = balance_kes - p_amount WHERE id = p_user_id;
  END IF;
  RETURN TRUE;
END;
$$;

-- Update fn_credit_balance for affiliate
CREATE OR REPLACE FUNCTION fn_credit_affiliate(
  p_user_id UUID,
  p_amount  DECIMAL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET affiliate_balance_kes = affiliate_balance_kes + p_amount WHERE id = p_user_id;
END;
$$;

-- Update dashboard stats function
CREATE OR REPLACE FUNCTION fn_admin_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_users',               (SELECT COUNT(*) FROM users),
    'active_today',              (SELECT COUNT(DISTINCT user_id) FROM trades WHERE created_at >= CURRENT_DATE AND is_demo = FALSE),
    'deposits_today_kes',        (SELECT COALESCE(SUM(amount_kes),0) FROM deposits WHERE status = 'completed' AND created_at >= CURRENT_DATE AND mpesa_transaction_id IS NOT NULL AND phone != 'MANUAL'),
    'withdrawals_today_kes',     (SELECT COALESCE(SUM(amount_kes),0) FROM withdrawals WHERE status = 'completed' AND created_at >= CURRENT_DATE AND phone != 'tournament'),
    'trades_today',              (SELECT COUNT(*) FROM trades WHERE created_at >= CURRENT_DATE AND is_demo = FALSE),
    'platform_profit_kes',       (SELECT COALESCE(SUM(payout_kes),0) FROM trades WHERE outcome = 'loss' AND is_demo = FALSE),
    'pending_withdrawals',       (SELECT COUNT(*) FROM withdrawals WHERE status IN ('pending','approved','processing') AND phone != 'tournament'),
    'active_trades_now',         (SELECT COUNT(*) FROM trades WHERE outcome = 'pending'),
    'deposits_alltime_kes',      (SELECT COALESCE(SUM(amount_kes),0) FROM deposits WHERE status = 'completed' AND mpesa_transaction_id IS NOT NULL AND phone != 'MANUAL'),
    'withdrawals_alltime_kes',   (SELECT COALESCE(SUM(amount_kes),0) FROM withdrawals WHERE status = 'completed' AND phone != 'tournament'),
    'manual_credits_today_kes',  (SELECT COALESCE(SUM(amount_kes),0) FROM deposits WHERE status = 'completed' AND created_at >= CURRENT_DATE AND (mpesa_transaction_id IS NULL OR phone = 'MANUAL')),
    'manual_credits_alltime_kes',(SELECT COALESCE(SUM(amount_kes),0) FROM deposits WHERE status = 'completed' AND (mpesa_transaction_id IS NULL OR phone = 'MANUAL'))
  ) INTO v_result;
  RETURN v_result;
END;
$$;
