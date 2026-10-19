-- Guestbook admin groundwork
-- Apply this migration to the existing Cloudflare D1 database before deploying
-- code that reads or writes these tables. This file is not executed automatically.

CREATE TABLE IF NOT EXISTS guestbook_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 24),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL,
  is_developer INTEGER NOT NULL DEFAULT 0 CHECK (is_developer IN (0, 1)),
  FOREIGN KEY (entry_id) REFERENCES guestbook_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guestbook_replies_entry_created
  ON guestbook_replies (entry_id, id ASC);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0
);
