CREATE TABLE IF NOT EXISTS guestbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 24),
  message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guestbook_entries_id ON guestbook_entries(id DESC);

-- Stores only a one-way hash of the visitor IP for temporary anti-spam throttling.
CREATE TABLE IF NOT EXISTS guestbook_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  last_post INTEGER NOT NULL
);
