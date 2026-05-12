-- Re-add FK from trades.pair_id to binary_pairs (binary trade platform uses binary_pairs exclusively).
-- The old FK to trading_pairs was dropped in migration 029.
ALTER TABLE trades
  ADD CONSTRAINT trades_pair_id_fkey
  FOREIGN KEY (pair_id) REFERENCES binary_pairs(id)
  ON DELETE RESTRICT;
