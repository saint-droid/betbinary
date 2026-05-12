create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  prize_fund numeric(12,2) not null default 0,
  participation_fee numeric(10,2) not null default 0,
  rebuy_fee numeric(10,2) not null default 0,
  starting_balance numeric(12,2) not null default 100,
  duration_hours int not null default 24,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  rules text not null default '',
  status text not null default 'upcoming',  -- upcoming | active | ended
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  trader_name text not null,
  avatar_seed text not null default '',
  country_code text not null default 'KE',
  result_balance numeric(12,2) not null default 0,
  prize_amount numeric(12,2) not null default 0,
  rank int not null default 0,
  created_at timestamptz default now()
);

create index if not exists tournament_entries_tournament_id_idx on tournament_entries(tournament_id);
