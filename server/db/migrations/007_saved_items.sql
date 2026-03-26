CREATE TABLE IF NOT EXISTS saved_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_item_id  UUID NOT NULL REFERENCES shared_cart_items(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_saved UNIQUE (user_id, source_item_id)
);
