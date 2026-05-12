-- Real users who have joined a tournament (distinct from fake tournament_entries)
create table if not exists tournament_participants (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  fee_paid_usd  numeric(12,8) not null default 0,
  fee_paid_kes  numeric(12,2) not null default 0,
  joined_at     timestamptz default now(),
  unique(tournament_id, user_id)
);

create index if not exists tournament_participants_tournament_id_idx on tournament_participants(tournament_id);
create index if not exists tournament_participants_user_id_idx on tournament_participants(user_id);
