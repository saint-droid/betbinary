-- Store bot config on the tournament so bots can auto-adjust
alter table tournaments
  add column if not exists bot_highest_win numeric(12,2) not null default 20000,
  add column if not exists bot_trade_count int not null default 10;

-- Store each real user's profit since joining (updated on every trade resolution)
alter table tournament_participants
  add column if not exists profit_kes numeric(12,2) not null default 0;
