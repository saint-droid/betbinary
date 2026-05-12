alter table trading_pairs add column if not exists payout_multiplier decimal(5,2) not null default 1.80;
