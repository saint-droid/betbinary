create table if not exists fake_traders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_seed text not null default '',   -- used to generate avatar (initials or DiceBear seed)
  country_code text not null default 'KE', -- 2-letter ISO code for flag
  profit_today numeric(12,2) not null default 0,
  profit_yesterday numeric(12,2) not null default 0,
  profit_this_week numeric(12,2) not null default 0,
  profit_last_week numeric(12,2) not null default 0,
  profit_this_month numeric(12,2) not null default 0,
  trades_today int not null default 0,
  trades_yesterday int not null default 0,
  trades_this_week int not null default 0,
  trades_last_week int not null default 0,
  trades_this_month int not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
