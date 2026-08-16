// SQLite storage. One file, WAL mode, synchronous better-sqlite3 —
// appropriate for a single-process trading desk of this size.

const Database = require('better-sqlite3');
const { DB_PATH } = require('./config');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_no TEXT UNIQUE NOT NULL,          -- AMR-P-0001 / AMR-M-0001 / AMR-W-0001
  kind TEXT NOT NULL,                   -- 'sale' | 'wanted'
  category TEXT NOT NULL,               -- 'paper' | 'metals'
  title TEXT NOT NULL,
  origin TEXT DEFAULT '',
  quantity TEXT DEFAULT '',
  spec TEXT DEFAULT '',                 -- private until details requested
  price TEXT DEFAULT '',                -- private until details requested
  notes TEXT DEFAULT '',                -- private until details requested
  photo TEXT DEFAULT '',                -- filename under MEDIA_DIR, private
  status TEXT NOT NULL DEFAULT 'live',  -- 'live' | 'placed' | 'archived'
  placed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  stale_notified_at INTEGER
);

CREATE TABLE IF NOT EXISTS counters (
  prefix TEXT PRIMARY KEY,              -- 'P' | 'M' | 'W'
  n INTEGER NOT NULL DEFAULT 0
);

-- Draft lots awaiting the Publish / Edit / Cancel confirmation in WhatsApp.
CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  payload TEXT NOT NULL,                -- JSON of the parsed lot fields
  state TEXT NOT NULL DEFAULT 'preview',-- 'preview' | 'editing'
  created_at INTEGER NOT NULL
);

-- Captured leads: enquiry form submissions and "request full details" events.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,                 -- 'enquiry' | 'reveal'
  lot_no TEXT DEFAULT '',
  name TEXT DEFAULT '',
  company TEXT DEFAULT '',
  contact TEXT DEFAULT '',              -- email or WhatsApp as given
  material TEXT DEFAULT '',
  quantity TEXT DEFAULT '',
  message TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0, -- double-opt-in ready; mail integration later
  confirm_token TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

-- Outbound WhatsApp pushes (enquiries, reveals, stale alerts). Queued so a
-- failed send is retried rather than lost — this queue is the bloodline of
-- the business.
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',-- 'queued' | 'sent' | 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_lots_status ON lots (status, kind);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
`);

for (const prefix of ['P', 'M', 'W']) {
  db.prepare('INSERT OR IGNORE INTO counters (prefix, n) VALUES (?, 0)').run(prefix);
}

function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

module.exports = { db, getMeta, setMeta };
