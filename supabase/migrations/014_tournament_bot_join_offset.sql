-- Offset in seconds from tournament start when this bot "joins" (appears on leaderboard)
alter table tournament_entries
  add column if not exists join_offset_secs int not null default 0;
