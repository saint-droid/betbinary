-- Platform notifications shown to all users via the bell icon on the trading page

create table if not exists platform_notifications (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  icon        text not null default 'info',   -- 'info' | 'success' | 'warning' | 'promo'
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Seed with the two notifications visible in the screenshots
insert into platform_notifications (title, body, icon, is_active, sort_order) values
  ('Welcome to BetaBinary!', 'Start trading with your demo account or deposit to trade with real money.', 'info', true, 1),
  ('Auto-Trading Available!', 'Set your strategy and let the bot trade for you automatically.', 'success', true, 2);
