-- Allow tournament_entries to store real users (not just bots)
alter table tournament_entries
  add column if not exists is_real boolean not null default false,
  add column if not exists user_id uuid references users(id) on delete cascade;

create index if not exists tournament_entries_user_id_idx on tournament_entries(user_id);
