CREATE TABLE IF NOT EXISTS reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES shared_cart_items(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('up', 'down', 'heart')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_reaction_per_type UNIQUE (item_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_item ON reactions(item_id);
