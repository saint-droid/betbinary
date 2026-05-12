-- ── Auto-cleanup: delete price_feed rows older than 6 hours ─────────────
-- Creates a function that can be called periodically to keep the table lean.
-- Called from the price simulation engine every hour.

CREATE OR REPLACE FUNCTION cleanup_old_price_feed()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM price_feed
  WHERE time_open < NOW() - INTERVAL '6 hours';
$$;
