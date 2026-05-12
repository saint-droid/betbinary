-- Drop the FK constraint so pair_id can hold IDs from either trading_pairs or binary_pairs.
-- History/admin routes join both tables and coalesce the name.
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_pair_id_fkey;
