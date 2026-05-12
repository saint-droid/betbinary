alter table platform_settings
  add column if not exists payout_multiplier_vip numeric(10,2) not null default 10.0;
