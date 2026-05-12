-- Per-trade-type payout multipliers
-- Defaults match Deriv's observed payouts from the UI screenshots

alter table platform_settings
  add column if not exists payout_even_odd        numeric(10,4) not null default 1.9522,
  add column if not exists payout_match           numeric(10,4) not null default 9.50,
  add column if not exists payout_differ          numeric(10,4) not null default 1.0556,
  add column if not exists payout_over            numeric(10,4) not null default 2.375,
  add column if not exists payout_under           numeric(10,4) not null default 1.90;
