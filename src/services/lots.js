// Lot lifecycle: numbering, creation, edits, closing, archiving, and the
// tiered public/private views that protect the book.

const { db } = require('../db');

const PLACED_TTL_MS = 48 * 60 * 60 * 1000;      // "PLACED" ribbon lifetime
const STALE_AFTER_MS = 21 * 24 * 60 * 60 * 1000; // untouched lots flagged stale

// AMR-P-0001 (paper sale) / AMR-M-0001 (metals sale) / AMR-W-0001 (wanted)
function nextLotNo(kind, category) {
  const prefix = kind === 'wanted' ? 'W' : category === 'metals' ? 'M' : 'P';
  const tx = db.transaction(() => {
    db.prepare('UPDATE counters SET n = n + 1 WHERE prefix = ?').run(prefix);
    return db.prepare('SELECT n FROM counters WHERE prefix = ?').get(prefix).n;
  });
  const n = tx();
  return `AMR-${prefix}-${String(n).padStart(4, '0')}`;
}

function createLot(fields) {
  const now = Date.now();
  const kind = fields.kind === 'wanted' ? 'wanted' : 'sale';
  const category = fields.category === 'metals' ? 'metals' : 'paper';
  const lotNo = nextLotNo(kind, category);
  db.prepare(
    `INSERT INTO lots (lot_no, kind, category, title, origin, quantity, spec, price, notes, photo, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?, ?)`
  ).run(
    lotNo, kind, category,
    fields.title || 'Untitled lot',
    fields.origin || '', fields.quantity || '', fields.spec || '',
    fields.price || '', fields.notes || '', fields.photo || '',
    now, now
  );
  return getByLotNo(lotNo);
}

function getByLotNo(lotNo) {
  return db.prepare('SELECT * FROM lots WHERE lot_no = ?').get(String(lotNo).toUpperCase());
}

const EDITABLE = ['title', 'origin', 'quantity', 'spec', 'price', 'notes', 'category', 'photo'];

function updateLot(lotNo, changes) {
  const lot = getByLotNo(lotNo);
  if (!lot) return null;
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(changes)) {
    if (EDITABLE.includes(k)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (!sets.length) return lot;
  vals.push(Date.now(), lot.id);
  db.prepare(`UPDATE lots SET ${sets.join(', ')}, updated_at = ?, stale_notified_at = NULL WHERE id = ?`).run(...vals);
  return getByLotNo(lotNo);
}

// SOLD / FOUND — discreet "PLACED" ribbon for 48h, then auto-archive.
function markPlaced(lotNo) {
  const lot = getByLotNo(lotNo);
  if (!lot || lot.status !== 'live') return null;
  const now = Date.now();
  db.prepare("UPDATE lots SET status = 'placed', placed_at = ?, updated_at = ? WHERE id = ?").run(now, now, lot.id);
  return getByLotNo(lotNo);
}

function archiveLot(lotNo) {
  const lot = getByLotNo(lotNo);
  if (!lot) return null;
  db.prepare("UPDATE lots SET status = 'archived', updated_at = ? WHERE id = ?").run(Date.now(), lot.id);
  return getByLotNo(lotNo);
}

function renewLot(lotNo) {
  const lot = getByLotNo(lotNo);
  if (!lot) return null;
  db.prepare('UPDATE lots SET updated_at = ?, stale_notified_at = NULL WHERE id = ?').run(Date.now(), lot.id);
  return getByLotNo(lotNo);
}

function liveLots(kind) {
  return db
    .prepare("SELECT * FROM lots WHERE kind = ? AND status IN ('live','placed') ORDER BY created_at DESC")
    .all(kind);
}

// Housekeeping sweeps, run by the scheduler.
function archiveExpiredPlaced() {
  const cutoff = Date.now() - PLACED_TTL_MS;
  return db
    .prepare("UPDATE lots SET status = 'archived' WHERE status = 'placed' AND placed_at < ?")
    .run(cutoff).changes;
}

function staleLots() {
  const cutoff = Date.now() - STALE_AFTER_MS;
  // Re-notify at most weekly so the owner is nudged, not nagged.
  const renotify = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return db
    .prepare(
      `SELECT * FROM lots WHERE status = 'live' AND updated_at < ?
       AND (stale_notified_at IS NULL OR stale_notified_at < ?)`
    )
    .all(cutoff, renotify);
}

function markStaleNotified(id) {
  db.prepare('UPDATE lots SET stale_notified_at = ? WHERE id = ?').run(Date.now(), id);
}

// ---- Tiered visibility ----
// Public cards show only: lot number, category, title, origin, quantity,
// status. Spec, price, notes and photos sit behind "Request full details".
function publicView(lot) {
  return {
    lot_no: lot.lot_no,
    kind: lot.kind,
    category: lot.category,
    title: lot.title,
    origin: lot.origin,
    quantity: lot.quantity,
    status: lot.status,
    placed: lot.status === 'placed',
    posted: new Date(lot.created_at).toISOString().slice(0, 10),
  };
}

function fullView(lot) {
  return {
    ...publicView(lot),
    spec: lot.spec,
    price: lot.price || 'Price on application',
    notes: lot.notes,
    photo: lot.photo ? `/media/${lot.photo}` : '',
  };
}

// One-line summary used in WhatsApp LIST replies and previews.
function summaryLine(lot) {
  const bits = [lot.lot_no, lot.title];
  if (lot.quantity) bits.push(lot.quantity);
  if (lot.status !== 'live') bits.push(lot.status.toUpperCase());
  return bits.join(' — ');
}

module.exports = {
  createLot, getByLotNo, updateLot, markPlaced, archiveLot, renewLot,
  liveLots, archiveExpiredPlaced, staleLots, markStaleNotified,
  publicView, fullView, summaryLine, EDITABLE,
};
