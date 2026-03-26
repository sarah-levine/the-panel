-- Add invite code to users for invite-link flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);

CREATE TABLE IF NOT EXISTS friendships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT friendships_ordered CHECK (user_a < user_b),
  CONSTRAINT friendships_unique UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
