CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES shared_cart_items(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);
