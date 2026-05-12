-- Fix: 1-second volatility indices use 1HZ* symbols, not R_* which are standard indices
-- Also add payout_multiplier column for per-pair override

alter table binary_pairs
  add column if not exists payout_multiplier decimal(5,2) not null default 1.80;

-- Update deriv_symbol to the correct 1-second index symbols
update binary_pairs set deriv_symbol = '1HZ10V'  where symbol = 'V10_1S';
update binary_pairs set deriv_symbol = '1HZ25V'  where symbol = 'V25_1S';
update binary_pairs set deriv_symbol = '1HZ50V'  where symbol = 'V50_1S';
update binary_pairs set deriv_symbol = '1HZ75V'  where symbol = 'V75_1S';
update binary_pairs set deriv_symbol = '1HZ100V' where symbol = 'V100_1S';
