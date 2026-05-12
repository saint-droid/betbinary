-- Social features: follows and likes for tournament traders (bots and real users)

-- Follows: who a user is following (by tournament_entry id)
CREATE TABLE IF NOT EXISTS trader_follows (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id         UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE CASCADE,
  trader_name      TEXT NOT NULL,
  is_bot           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, entry_id)
);

-- Likes: who a user has liked (by tournament_entry id)
CREATE TABLE IF NOT EXISTS trader_likes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id         UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE CASCADE,
  trader_name      TEXT NOT NULL,
  is_bot           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(liker_id, entry_id)
);

-- Bot profile stats shown on public profile pages
ALTER TABLE tournament_entries
  ADD COLUMN IF NOT EXISTS bot_total_trades    INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_win_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_total_profit    NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_best_trade      NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_country         TEXT         NOT NULL DEFAULT 'KE',
  ADD COLUMN IF NOT EXISTS bot_bio             TEXT;

CREATE INDEX IF NOT EXISTS idx_trader_follows_follower ON trader_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_trader_follows_entry    ON trader_follows(entry_id);
CREATE INDEX IF NOT EXISTS idx_trader_likes_liker      ON trader_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_trader_likes_entry      ON trader_likes(entry_id);
