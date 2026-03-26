CREATE TABLE IF NOT EXISTS shared_cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  retailer    TEXT NOT NULL,
  name        TEXT NOT NULL,
  price       TEXT,
  image_url   TEXT,
  item_url    TEXT,
  category    TEXT,
  note        TEXT,
  is_private  BOOLEAN NOT NULL DEFAULT false,
  local_id    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at  TIMESTAMPTZ,
  CONSTRAINT unique_user_local_id UNIQUE (user_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_cart_user ON shared_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_cart_active ON shared_cart_items(user_id) WHERE removed_at IS NULL;
