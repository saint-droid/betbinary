-- ================================================================
-- Edge Forex TRADING PLATFORM
-- Complete Supabase Schema — Tables, Functions, Triggers, RLS
-- Paste entire file into Supabase SQL Editor and run once
-- ================================================================

-- ── EXTENSIONS ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- TABLES
-- ================================================================

-- ── TABLE: admins ────────────────────────────────────────────────
-- Separate admin accounts (email + bcrypt password, no Supabase Auth)
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Admin',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username              TEXT UNIQUE NOT NULL,
  phone                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  balance_usd           DECIMAL(18,8) NOT NULL DEFAULT 0
                          CHECK (balance_usd >= 0),
  affiliate_balance_usd DECIMAL(18,8) NOT NULL DEFAULT 0
                          CHECK (affiliate_balance_usd >= 0),
  account_type          TEXT NOT NULL DEFAULT 'standard'
                          CHECK (account_type IN ('standard','vip','demo')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','suspended')),
  referral_code         TEXT UNIQUE,
  referred_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  currency_preference   TEXT NOT NULL DEFAULT 'KES'
                          CHECK (currency_preference IN ('KES','USD')),
  demo_balance          DECIMAL(18,8) NOT NULL DEFAULT 0,
  is_admin              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: platform_settings (always exactly 1 row) ─────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id                                    INT PRIMARY KEY DEFAULT 1,

  -- General
  site_name                             TEXT NOT NULL DEFAULT 'Edge Forex',
  logo_url                              TEXT,
  favicon_url                           TEXT,
  footer_text                           TEXT DEFAULT '© 2024 Edge Forex Trading',
  maintenance_mode                      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Currency
  conversion_rate                       DECIMAL(18,4) NOT NULL DEFAULT 129.00,
  default_currency                      TEXT NOT NULL DEFAULT 'KES'
                                          CHECK (default_currency IN ('KES','USD')),
  show_currency_switcher                BOOLEAN NOT NULL DEFAULT TRUE,

  -- Chart & Trading
  candle_duration_seconds               INT NOT NULL DEFAULT 60,
  trade_duration_seconds                INT NOT NULL DEFAULT 10,
  payout_multiplier                     DECIMAL(5,2) NOT NULL DEFAULT 1.80,
  buy_button_label                      TEXT NOT NULL DEFAULT 'BUY',
  sell_button_label                     TEXT NOT NULL DEFAULT 'SELL',
  market_status                         TEXT NOT NULL DEFAULT 'live'
                                          CHECK (market_status IN ('live','offline')),
  demo_starting_balance                 DECIMAL(18,8) NOT NULL DEFAULT 1000.00,
  show_demo_badge                       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Deposits
  min_deposit_kes                       DECIMAL(18,2) NOT NULL DEFAULT 100,
  max_deposit_kes                       DECIMAL(18,2) NOT NULL DEFAULT 10000,
  deposit_fee_type                      TEXT NOT NULL DEFAULT 'none'
                                          CHECK (deposit_fee_type IN ('none','percent','flat')),
  deposit_fee_value                     DECIMAL(10,4) NOT NULL DEFAULT 0,
  mpesa_paybill                         TEXT,
  mpesa_consumer_key                    TEXT,
  mpesa_consumer_secret                 TEXT,
  mpesa_passkey                         TEXT,
  mpesa_shortcode                       TEXT,
  auto_confirm_deposits                 BOOLEAN NOT NULL DEFAULT TRUE,

  -- Withdrawals
  min_withdrawal_kes                    DECIMAL(18,2) NOT NULL DEFAULT 100,
  max_withdrawal_kes                    DECIMAL(18,2) NOT NULL DEFAULT 150000,
  withdrawal_approval_mode              TEXT NOT NULL DEFAULT 'profit_based'
                                          CHECK (withdrawal_approval_mode IN (
                                            'auto_all','auto_threshold',
                                            'profit_based','manual_all')),
  auto_approve_withdrawal_threshold     DECIMAL(18,2) NOT NULL DEFAULT 5000,
  allow_multiple_pending_withdrawals    BOOLEAN NOT NULL DEFAULT FALSE,
  withdrawal_paused                     BOOLEAN NOT NULL DEFAULT FALSE,
  withdrawal_processing_message        TEXT NOT NULL DEFAULT
    'Your withdrawal is being processed. Funds will be sent to your registered M-Pesa number within 24 hours.',
  withdrawal_rejection_reasons          JSONB NOT NULL DEFAULT
    '["Insufficient trading activity","Verification required","Suspicious activity","Account under review","Other"]'::JSONB,
  mpesa_b2c_initiator_name              TEXT,
  mpesa_b2c_security_credential        TEXT,
  mpesa_b2c_shortcode                   TEXT,

  -- House Edge
  house_win_rate                        DECIMAL(5,4) NOT NULL DEFAULT 0.65
                                          CHECK (house_win_rate BETWEEN 0 AND 1),
  house_win_rate_vip                    DECIMAL(5,4) NOT NULL DEFAULT 0.60
                                          CHECK (house_win_rate_vip BETWEEN 0 AND 1),
  house_win_rate_demo                   DECIMAL(5,4) NOT NULL DEFAULT 0.50
                                          CHECK (house_win_rate_demo BETWEEN 0 AND 1),
  per_user_override_enabled             BOOLEAN NOT NULL DEFAULT TRUE,

  -- Chat Simulation
  chat_simulation_enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  chat_simulation_freq_min_secs         INT NOT NULL DEFAULT 20,
  chat_simulation_freq_max_secs         INT NOT NULL DEFAULT 60,
  chat_simulation_amount_min_kes        INT NOT NULL DEFAULT 500,
  chat_simulation_amount_max_kes        INT NOT NULL DEFAULT 15000,
  chat_simulation_message_template      TEXT NOT NULL DEFAULT
    'System: {name} has successfully withdrawn KES {amount}. Congratulations! ✅',
  chat_real_users_enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  chat_pinned_message                   TEXT,

  -- News Ticker
  news_ticker_enabled                   BOOLEAN NOT NULL DEFAULT TRUE,
  news_scroll_speed                     INT NOT NULL DEFAULT 40,

  -- Referrals
  referral_enabled                      BOOLEAN NOT NULL DEFAULT TRUE,
  referral_l1_percent                   DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  referral_l2_percent                   DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  referral_l3_percent                   DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  min_referral_withdrawal_kes           DECIMAL(18,2) NOT NULL DEFAULT 100,

  -- Welcome Bonus
  welcome_bonus_enabled                 BOOLEAN NOT NULL DEFAULT TRUE,
  welcome_bonus_percent                 DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  welcome_bonus_min_deposit_kes         DECIMAL(18,2) NOT NULL DEFAULT 500,

  -- Offer Bonus
  offer_bonus_min_amount_kes            DECIMAL(18,2) NOT NULL DEFAULT 10,

  -- How To Trade Steps
  how_to_trade_steps                    JSONB NOT NULL DEFAULT '[
    {"step":1,"title":"Instant Funding","body":"Top up your account in seconds using M-Pesa."},
    {"step":2,"title":"Pick Your Forecast","body":"Predict where the price will be after the trade window closes."},
    {"step":3,"title":"Enter Your Trade","body":"Select your stake and click BUY or SELL."},
    {"step":4,"title":"Wait for Processing","body":"Your trade is locked for the trade duration."},
    {"step":5,"title":"Claim Your Payout","body":"Winnings credited to your balance instantly on win."},
    {"step":6,"title":"Support","body":"Submit a ticket from your dashboard if you need help."}
  ]'::JSONB,

  updated_at                            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_settings_row CHECK (id = 1)
);

INSERT INTO platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ── TABLE: trading_pairs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trading_pairs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol            TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  is_simulated      BOOLEAN NOT NULL DEFAULT TRUE,
  base_price        DECIMAL(18,8) NOT NULL DEFAULT 5.000000,
  volatility        DECIMAL(10,8) NOT NULL DEFAULT 0.00080000,
  drift             DECIMAL(10,8) NOT NULL DEFAULT 0.00001000,
  spread            DECIMAL(10,8) NOT NULL DEFAULT 0.00006000,
  quick_amounts_kes JSONB NOT NULL DEFAULT '[50,100,250,500,1000]'::JSONB,
  quick_amounts_usd JSONB NOT NULL DEFAULT '[1,5,10,25,50,100]'::JSONB,
  min_trade_kes     DECIMAL(18,2) NOT NULL DEFAULT 50,
  max_trade_kes     DECIMAL(18,2) NOT NULL DEFAULT 50000,
  min_trade_usd     DECIMAL(18,2) NOT NULL DEFAULT 1,
  max_trade_usd     DECIMAL(18,2) NOT NULL DEFAULT 500,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO trading_pairs
  (symbol, display_name, is_simulated, base_price, volatility, drift, spread, sort_order)
VALUES
  ('GLOBAL/USD','Global / USD', TRUE, 5.000000, 0.00080000, 0.00001000, 0.00006000, 1)
ON CONFLICT DO NOTHING;

-- ── TABLE: price_feed ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_feed (
  id            BIGSERIAL PRIMARY KEY,
  pair_id       UUID NOT NULL REFERENCES trading_pairs(id) ON DELETE CASCADE,
  time_open     TIMESTAMPTZ NOT NULL,
  open          DECIMAL(18,8) NOT NULL,
  high          DECIMAL(18,8) NOT NULL,
  low           DECIMAL(18,8) NOT NULL,
  close         DECIMAL(18,8) NOT NULL,
  volume        DECIMAL(18,4) NOT NULL DEFAULT 0,
  is_simulated  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS price_feed_pair_id_time_open_key
  ON price_feed(pair_id, time_open);

CREATE INDEX IF NOT EXISTS idx_price_feed_pair_time
  ON price_feed(pair_id, time_open DESC);

-- ── TABLE: trades ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pair_id       UUID NOT NULL REFERENCES trading_pairs(id),
  direction     TEXT NOT NULL CHECK (direction IN ('buy','sell')),
  amount_usd    DECIMAL(18,8) NOT NULL,
  amount_kes    DECIMAL(18,2) NOT NULL,
  entry_price   DECIMAL(18,8) NOT NULL,
  exit_price    DECIMAL(18,8),
  outcome       TEXT NOT NULL DEFAULT 'pending'
                  CHECK (outcome IN ('pending','win','loss','cancelled')),
  payout_usd    DECIMAL(18,8) NOT NULL DEFAULT 0,
  is_demo       BOOLEAN NOT NULL DEFAULT FALSE,
  house_forced  BOOLEAN NOT NULL DEFAULT FALSE,
  early_closed  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id    ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_pending    ON trades(outcome) WHERE outcome = 'pending';
CREATE INDEX IF NOT EXISTS idx_trades_expires_at ON trades(expires_at) WHERE outcome = 'pending';

-- ── TABLE: deposits ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kes            DECIMAL(18,2) NOT NULL,
  amount_usd            DECIMAL(18,8) NOT NULL,
  conversion_rate_used  DECIMAL(18,4) NOT NULL,
  mpesa_transaction_id  TEXT UNIQUE,
  phone                 TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','completed','failed','cancelled')),
  manually_approved_by  UUID REFERENCES admins(id) ON DELETE SET NULL,
  bonus_applied         BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_amount_usd      DECIMAL(18,8) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status  ON deposits(status);

-- ── TABLE: withdrawals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kes            DECIMAL(18,2) NOT NULL,
  amount_usd            DECIMAL(18,8) NOT NULL,
  conversion_rate_used  DECIMAL(18,4) NOT NULL,
  mpesa_transaction_id  TEXT,
  phone                 TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending','approved','processing',
                            'completed','rejected','cancelled')),
  approval_mode         TEXT NOT NULL DEFAULT 'manual'
                          CHECK (approval_mode IN ('auto','manual')),
  user_total_deposited  DECIMAL(18,2) NOT NULL DEFAULT 0,
  is_profit_withdrawal  BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason      TEXT,
  approved_by           UUID REFERENCES admins(id) ON DELETE SET NULL,
  admin_notes           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status  ON withdrawals(status);

-- ── TABLE: referral_commissions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id        UUID REFERENCES trades(id) ON DELETE SET NULL,
  level           INT NOT NULL CHECK (level IN (1,2,3)),
  percent         DECIMAL(5,2) NOT NULL,
  amount_usd      DECIMAL(18,8) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'paid'
                    CHECK (status IN ('pending','paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: chat_messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  username    TEXT,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'user'
                CHECK (type IN ('user','system_simulated','system_real')),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at DESC);

-- ── TABLE: news_items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO news_items (headline, sort_order) VALUES
  ('Welcome to Edge Forex — Trade smarter, earn faster', 1),
  ('Markets are live 24/5 — Start trading now', 2),
  ('Deposit via M-Pesa instantly and start earning', 3)
ON CONFLICT DO NOTHING;

-- ── TABLE: promo_codes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT UNIQUE NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value                 DECIMAL(10,4) NOT NULL,
  condition_min_deposit DECIMAL(18,2) NOT NULL DEFAULT 0,
  expiry_date           TIMESTAMPTZ,
  usage_limit           INT,
  times_used            INT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: user_promo_redemptions ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_promo_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_id    UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, promo_id)
);

-- ── TABLE: support_tickets ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: ticket_messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID,
  sender_type TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user','admin')),
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: user_overrides ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_overrides (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  custom_win_rate         DECIMAL(5,4)
                            CHECK (custom_win_rate BETWEEN 0 AND 1),
  is_blocked_from_trading BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked_from_chat    BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes             TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE: simulation_name_pool ──────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_name_pool (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO simulation_name_pool (name) VALUES
  ('Nyanchera'),('Kavutha'),('Tabby'),('Obuya'),('Nduta'),
  ('Kamau'),('Wanjiku'),('Otieno'),('Akinyi'),('Mwangi'),
  ('Chebet'),('Korir'),('Njeri'),('Mutua'),('Adhiambo'),
  ('Kibet'),('Waweru'),('Auma'),('Kimani'),('Chelangat'),
  ('Zainabu'),('Baraka'),('Kelvin'),('Cynthia'),('Festus'),
  ('Grace'),('Brian'),('Mercy'),('Samuel'),('Faith')
ON CONFLICT DO NOTHING;

-- ── TABLE: support_subjects ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0
);

INSERT INTO support_subjects (label, sort_order) VALUES
  ('Deposit Issue', 1),
  ('Withdrawal Issue', 2),
  ('Account Problem', 3),
  ('Trade Dispute', 4),
  ('Bonus Query', 5),
  ('Technical Issue', 6),
  ('Other', 7)
ON CONFLICT DO NOTHING;

-- ================================================================
-- FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code :=
      UPPER(SUBSTR(MD5(NEW.id::TEXT || RANDOM()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_set_demo_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_type = 'demo' AND NEW.demo_balance = 0 THEN
    SELECT demo_starting_balance
    INTO NEW.demo_balance
    FROM platform_settings WHERE id = 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_credit_balance(
  p_user_id   UUID,
  p_amount    DECIMAL,
  p_is_demo   BOOLEAN DEFAULT FALSE
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_is_demo THEN
    UPDATE users SET demo_balance = demo_balance + p_amount WHERE id = p_user_id;
  ELSE
    UPDATE users SET balance_usd = balance_usd + p_amount WHERE id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_debit_balance(
  p_user_id   UUID,
  p_amount    DECIMAL,
  p_is_demo   BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_balance DECIMAL;
BEGIN
  IF p_is_demo THEN
    SELECT demo_balance INTO v_balance FROM users WHERE id = p_user_id;
    IF v_balance < p_amount THEN RETURN FALSE; END IF;
    UPDATE users SET demo_balance = demo_balance - p_amount WHERE id = p_user_id;
  ELSE
    SELECT balance_usd INTO v_balance FROM users WHERE id = p_user_id;
    IF v_balance < p_amount THEN RETURN FALSE; END IF;
    UPDATE users SET balance_usd = balance_usd - p_amount WHERE id = p_user_id;
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION fn_credit_referral(
  p_beneficiary_id  UUID,
  p_from_user_id    UUID,
  p_trade_id        UUID,
  p_level           INT,
  p_percent         DECIMAL,
  p_trade_amount    DECIMAL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_commission DECIMAL;
BEGIN
  v_commission := p_trade_amount * (p_percent / 100.0);
  UPDATE users
  SET affiliate_balance_usd = affiliate_balance_usd + v_commission
  WHERE id = p_beneficiary_id;
  INSERT INTO referral_commissions
    (beneficiary_id, from_user_id, trade_id, level, percent, amount_usd, status)
  VALUES
    (p_beneficiary_id, p_from_user_id, p_trade_id, p_level, p_percent, v_commission, 'paid');
END;
$$;

CREATE OR REPLACE FUNCTION fn_resolve_trade(
  p_trade_id      UUID,
  p_exit_price    DECIMAL,
  p_outcome       TEXT,
  p_house_forced  BOOLEAN DEFAULT FALSE,
  p_early_closed  BOOLEAN DEFAULT FALSE
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_trade      trades%ROWTYPE;
  v_multiplier DECIMAL;
  v_payout     DECIMAL;
  v_l1_user    UUID;
  v_l2_user    UUID;
  v_l3_user    UUID;
  v_l1_pct     DECIMAL;
  v_l2_pct     DECIMAL;
  v_l3_pct     DECIMAL;
  v_ref_on     BOOLEAN;
BEGIN
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  SELECT payout_multiplier, referral_enabled,
         referral_l1_percent, referral_l2_percent, referral_l3_percent
  INTO v_multiplier, v_ref_on, v_l1_pct, v_l2_pct, v_l3_pct
  FROM platform_settings WHERE id = 1;

  IF p_outcome = 'win' THEN
    v_payout := v_trade.amount_usd * v_multiplier;
    PERFORM fn_credit_balance(v_trade.user_id, v_payout, v_trade.is_demo);
    IF NOT v_trade.is_demo AND v_ref_on THEN
      SELECT referred_by INTO v_l1_user FROM users WHERE id = v_trade.user_id;
      IF v_l1_user IS NOT NULL THEN
        PERFORM fn_credit_referral(v_l1_user, v_trade.user_id, p_trade_id, 1, v_l1_pct, v_trade.amount_usd);
        SELECT referred_by INTO v_l2_user FROM users WHERE id = v_l1_user;
        IF v_l2_user IS NOT NULL THEN
          PERFORM fn_credit_referral(v_l2_user, v_trade.user_id, p_trade_id, 2, v_l2_pct, v_trade.amount_usd);
          SELECT referred_by INTO v_l3_user FROM users WHERE id = v_l2_user;
          IF v_l3_user IS NOT NULL THEN
            PERFORM fn_credit_referral(v_l3_user, v_trade.user_id, p_trade_id, 3, v_l3_pct, v_trade.amount_usd);
          END IF;
        END IF;
      END IF;
    END IF;
  ELSE
    v_payout := 0;
  END IF;

  UPDATE trades SET
    exit_price   = p_exit_price,
    outcome      = p_outcome,
    payout_usd   = v_payout,
    house_forced = p_house_forced,
    early_closed = p_early_closed,
    resolved_at  = NOW()
  WHERE id = p_trade_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_confirm_deposit(p_deposit_id UUID)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_deposit        deposits%ROWTYPE;
  v_settings       platform_settings%ROWTYPE;
  v_bonus_usd      DECIMAL := 0;
  v_prior_deposits INT;
BEGIN
  SELECT * INTO v_deposit  FROM deposits          WHERE id = p_deposit_id;
  SELECT * INTO v_settings FROM platform_settings WHERE id = 1;
  PERFORM fn_credit_balance(v_deposit.user_id, v_deposit.amount_usd, FALSE);
  SELECT COUNT(*) INTO v_prior_deposits
  FROM deposits
  WHERE user_id = v_deposit.user_id AND status = 'completed' AND id != p_deposit_id;
  IF v_settings.welcome_bonus_enabled
     AND v_prior_deposits = 0
     AND v_deposit.amount_kes >= v_settings.welcome_bonus_min_deposit_kes
  THEN
    v_bonus_usd := v_deposit.amount_usd * (v_settings.welcome_bonus_percent / 100.0);
    PERFORM fn_credit_balance(v_deposit.user_id, v_bonus_usd, FALSE);
  END IF;
  UPDATE deposits SET
    status = 'completed', bonus_applied = (v_bonus_usd > 0),
    bonus_amount_usd = v_bonus_usd, completed_at = NOW()
  WHERE id = p_deposit_id;
  RETURN json_build_object('success', TRUE, 'credited_usd', v_deposit.amount_usd, 'bonus_usd', v_bonus_usd);
END;
$$;

CREATE OR REPLACE FUNCTION fn_request_withdrawal(
  p_user_id UUID, p_amount_kes DECIMAL, p_amount_usd DECIMAL, p_phone TEXT
) RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_settings            platform_settings%ROWTYPE;
  v_total_deposited_kes DECIMAL;
  v_approval_mode       TEXT;
  v_is_profit           BOOLEAN := FALSE;
  v_pending_count       INT;
  v_withdrawal_id       UUID;
  v_ok                  BOOLEAN;
BEGIN
  SELECT * INTO v_settings FROM platform_settings WHERE id = 1;
  IF v_settings.withdrawal_paused THEN
    RETURN json_build_object('success', FALSE, 'message', 'Withdrawals are temporarily paused.');
  END IF;
  IF NOT v_settings.allow_multiple_pending_withdrawals THEN
    SELECT COUNT(*) INTO v_pending_count FROM withdrawals
    WHERE user_id = p_user_id AND status IN ('pending','approved','processing');
    IF v_pending_count > 0 THEN
      RETURN json_build_object('success', FALSE, 'message', 'You already have a withdrawal being processed.');
    END IF;
  END IF;
  IF p_amount_kes < v_settings.min_withdrawal_kes THEN
    RETURN json_build_object('success', FALSE, 'message', FORMAT('Minimum withdrawal is KES %s', v_settings.min_withdrawal_kes));
  END IF;
  IF p_amount_kes > v_settings.max_withdrawal_kes THEN
    RETURN json_build_object('success', FALSE, 'message', FORMAT('Maximum withdrawal is KES %s', v_settings.max_withdrawal_kes));
  END IF;
  v_ok := fn_debit_balance(p_user_id, p_amount_usd, FALSE);
  IF NOT v_ok THEN
    RETURN json_build_object('success', FALSE, 'message', 'Insufficient balance.');
  END IF;
  SELECT COALESCE(SUM(amount_kes), 0) INTO v_total_deposited_kes
  FROM deposits WHERE user_id = p_user_id AND status = 'completed';
  v_is_profit := p_amount_kes > v_total_deposited_kes;
  v_approval_mode := CASE v_settings.withdrawal_approval_mode
    WHEN 'auto_all'       THEN 'auto'
    WHEN 'auto_threshold' THEN CASE WHEN p_amount_kes <= v_settings.auto_approve_withdrawal_threshold THEN 'auto' ELSE 'manual' END
    WHEN 'profit_based'   THEN CASE WHEN v_is_profit THEN 'manual' ELSE 'auto' END
    WHEN 'manual_all'     THEN 'manual'
    ELSE 'manual'
  END;
  INSERT INTO withdrawals (user_id, amount_kes, amount_usd, conversion_rate_used, phone, status, approval_mode, user_total_deposited, is_profit_withdrawal)
  VALUES (p_user_id, p_amount_kes, p_amount_usd, v_settings.conversion_rate, p_phone,
          CASE WHEN v_approval_mode = 'auto' THEN 'approved' ELSE 'pending' END,
          v_approval_mode, v_total_deposited_kes, v_is_profit)
  RETURNING id INTO v_withdrawal_id;
  RETURN json_build_object('success', TRUE, 'withdrawal_id', v_withdrawal_id, 'approval_mode', v_approval_mode,
    'message', CASE WHEN v_approval_mode = 'auto' THEN 'Withdrawal approved. Funds will be sent shortly.' ELSE v_settings.withdrawal_processing_message END);
END;
$$;

CREATE OR REPLACE FUNCTION fn_approve_withdrawal(p_withdrawal_id UUID, p_approved_by UUID)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_w withdrawals%ROWTYPE;
BEGIN
  SELECT * INTO v_w FROM withdrawals WHERE id = p_withdrawal_id;
  IF v_w.status NOT IN ('pending') THEN
    RETURN json_build_object('success', FALSE, 'message', 'Withdrawal is not in pending status.');
  END IF;
  UPDATE withdrawals SET status = 'approved', approved_by = p_approved_by WHERE id = p_withdrawal_id;
  RETURN json_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION fn_reject_withdrawal(p_withdrawal_id UUID, p_rejected_by UUID, p_reason TEXT)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_w withdrawals%ROWTYPE;
BEGIN
  SELECT * INTO v_w FROM withdrawals WHERE id = p_withdrawal_id;
  IF v_w.status NOT IN ('pending','approved') THEN
    RETURN json_build_object('success', FALSE, 'message', 'Cannot reject a withdrawal in its current state.');
  END IF;
  PERFORM fn_credit_balance(v_w.user_id, v_w.amount_usd, FALSE);
  UPDATE withdrawals SET status = 'rejected', rejection_reason = p_reason, approved_by = p_rejected_by WHERE id = p_withdrawal_id;
  RETURN json_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION fn_prune_price_feed()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM price_feed
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY pair_id ORDER BY time_open DESC) AS rn
      FROM price_feed
    ) ranked WHERE rn <= 500
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_admin_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_users',          (SELECT COUNT(*) FROM users),
    'active_today',         (SELECT COUNT(DISTINCT user_id) FROM trades WHERE created_at >= CURRENT_DATE AND is_demo = FALSE),
    'deposits_today_kes',   (SELECT COALESCE(SUM(amount_kes),0) FROM deposits WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    'withdrawals_today_kes',(SELECT COALESCE(SUM(amount_kes),0) FROM withdrawals WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    'trades_today',         (SELECT COUNT(*) FROM trades WHERE created_at >= CURRENT_DATE AND is_demo = FALSE),
    'platform_profit_usd',  (SELECT COALESCE(SUM(amount_usd),0) FROM trades WHERE outcome = 'loss' AND is_demo = FALSE),
    'pending_withdrawals',  (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'),
    'active_trades_now',    (SELECT COUNT(*) FROM trades WHERE outcome = 'pending'),
    'deposits_alltime_kes', (SELECT COALESCE(SUM(amount_kes),0) FROM deposits WHERE status = 'completed'),
    'withdrawals_alltime_kes',(SELECT COALESCE(SUM(amount_kes),0) FROM withdrawals WHERE status = 'completed')
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ================================================================
-- TRIGGERS
-- ================================================================

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_trading_pairs_updated_at
  BEFORE UPDATE ON trading_pairs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_user_overrides_updated_at
  BEFORE UPDATE ON user_overrides
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_user_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION fn_generate_referral_code();

CREATE TRIGGER trg_user_demo_balance
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_demo_balance();

CREATE OR REPLACE FUNCTION fn_trigger_prune_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM price_feed WHERE pair_id = NEW.pair_id) > 520 THEN
    PERFORM fn_prune_price_feed();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prune_price_feed
  AFTER INSERT ON price_feed
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_prune_price();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_overrides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_feed             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_pairs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_name_pool   ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes            ENABLE ROW LEVEL SECURITY;

-- admins table: no RLS (accessed only via service role from API routes)
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Trades: own rows only
CREATE POLICY "trades_own" ON trades FOR ALL USING (auth.uid() = user_id);

-- Deposits: own rows only
CREATE POLICY "deposits_own" ON deposits FOR ALL USING (auth.uid() = user_id);

-- Withdrawals: own rows only
CREATE POLICY "withdrawals_own" ON withdrawals FOR ALL USING (auth.uid() = user_id);

-- Referral commissions: own rows only
CREATE POLICY "commissions_own" ON referral_commissions FOR SELECT USING (auth.uid() = beneficiary_id);

-- Chat: read non-deleted, insert own
CREATE POLICY "chat_read"   ON chat_messages FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Support tickets: own only
CREATE POLICY "tickets_own"          ON support_tickets  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ticket_messages_own"  ON ticket_messages  FOR SELECT USING (TRUE);

-- User overrides: own read
CREATE POLICY "overrides_own_read" ON user_overrides FOR SELECT USING (auth.uid() = user_id);

-- Promo redemptions: own only
CREATE POLICY "promo_redemptions_own" ON user_promo_redemptions FOR ALL USING (auth.uid() = user_id);

-- Public read
CREATE POLICY "price_feed_public_read"    ON price_feed       FOR SELECT USING (TRUE);
CREATE POLICY "trading_pairs_public_read" ON trading_pairs    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "settings_public_read"      ON platform_settings FOR SELECT USING (TRUE);
CREATE POLICY "news_public_read"          ON news_items        FOR SELECT USING (is_active = TRUE);
CREATE POLICY "subjects_public_read"      ON support_subjects  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "promos_public_read"        ON promo_codes       FOR SELECT USING (is_active = TRUE);
CREATE POLICY "sim_names_public_read"     ON simulation_name_pool FOR SELECT USING (is_active = TRUE);

-- ================================================================
-- SEED: Create first admin account
-- Run this separately after setting your desired password hash:
-- SELECT crypt('your_password', gen_salt('bf')) to generate hash
-- ================================================================

-- INSERT INTO admins (email, password_hash, name)
-- VALUES ('admin@edgeforex.com', crypt('your_password_here', gen_salt('bf')), 'Super Admin');

-- ================================================================
-- END OF SCHEMA
-- ================================================================
