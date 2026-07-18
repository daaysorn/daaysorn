CREATE TABLE IF NOT EXISTS keeps (
  id TEXT PRIMARY KEY,
  href TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  telegram_message_id BIGINT NOT NULL UNIQUE,
  raw_text TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS keeps_saved_at_idx ON keeps (saved_at DESC);
