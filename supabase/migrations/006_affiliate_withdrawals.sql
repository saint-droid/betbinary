create table if not exists affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount_kes numeric(18,2) not null,
  amount_usd numeric(18,8) not null,
  phone text not null,
  status text not null default 'pending',  -- pending | completed | rejected
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists affiliate_withdrawals_user_id_idx on affiliate_withdrawals(user_id);
create index if not exists affiliate_withdrawals_status_idx on affiliate_withdrawals(status);
