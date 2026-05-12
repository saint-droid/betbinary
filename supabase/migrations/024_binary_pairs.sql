-- Binary pairs table — used exclusively by the /trade page for digit-based contracts
-- (Even/Odd, Matches/Differs, Over/Under). Separate from trading_pairs (forex).
-- Payouts come from platform_settings, not stored per-pair.

create table if not exists binary_pairs (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  display_name  text not null default '',
  deriv_symbol  text not null default '',
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists binary_pairs_active_idx on binary_pairs (is_active, sort_order);

-- Seed with the Deriv volatility indices that show in the screenshots
insert into binary_pairs (symbol, display_name, deriv_symbol, is_active, sort_order) values
  ('V10_1S',  'Volatility 10 (1s) Index',  'R_10',    true, 1),
  ('V25_1S',  'Volatility 25 (1s) Index',  'R_25',    true, 2),
  ('V50_1S',  'Volatility 50 (1s) Index',  'R_50',    true, 3),
  ('V75_1S',  'Volatility 75 (1s) Index',  'R_75',    true, 4),
  ('V100_1S', 'Volatility 100 (1s) Index', 'R_100',   true, 5)
on conflict do nothing;
