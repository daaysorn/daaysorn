CREATE TABLE IF NOT EXISTS keeps (
  id TEXT PRIMARY KEY,
  href TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  telegram_message_id BIGINT NOT NULL,
  raw_text TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS keeps_saved_at_idx ON keeps (saved_at DESC);

CREATE TABLE IF NOT EXISTS keeps_sync_groups (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS keeps_sync_items (
  group_id TEXT NOT NULL REFERENCES keeps_sync_groups(id) ON DELETE CASCADE,
  keep_id TEXT NOT NULL,
  saved BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, keep_id)
);

CREATE INDEX IF NOT EXISTS keeps_sync_items_group_saved_idx
  ON keeps_sync_items (group_id, saved);
