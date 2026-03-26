CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('comment', 'reaction', 'friend_accepted', 'item_saved', 'invite_received')),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  item_id     UUID REFERENCES shared_cart_items(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = false;
