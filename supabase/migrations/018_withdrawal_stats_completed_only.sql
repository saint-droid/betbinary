-- Real withdrawals = status 'completed' (B2C confirmed) only, not 'approved' (pending processing)
-- 'approved' means admin approved but money not yet sent

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
    'platform_profit_usd',       (SELECT COALESCE(SUM(amount_usd),0) FROM trades WHERE outcome = 'loss' AND is_demo = FALSE),
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
