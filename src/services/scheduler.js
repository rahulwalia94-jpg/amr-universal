// Housekeeping: archive expired PLACED ribbons, flag stale lots with
// Renew / Archive buttons, and run the automatic Sunday backup.

const { getMeta, setMeta } = require('../db');
const { whatsapp, whatsappEnabled, DB_PATH } = require('../config');
const lots = require('./lots');
const { sendButtons, sendDocument } = require('./whatsapp');

const SWEEP_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes

async function sweep() {
  // 1. PLACED lots older than 48h quietly leave the board.
  const archived = lots.archiveExpiredPlaced();
  if (archived) console.log(`[scheduler] archived ${archived} placed lot(s)`);

  // 2. Stale lots (21 days untouched): message the owner with buttons.
  //    The public board must never look abandoned.
  if (whatsappEnabled) {
    for (const lot of lots.staleLots()) {
      for (const admin of whatsapp.adminNumbers) {
        try {
          await sendButtons(
            admin,
            `${lot.lot_no} — "${lot.title}" has been on the board for three weeks without a touch. Renew it or let it go?`,
            [
              { id: `renew:${lot.lot_no}`, title: 'Renew' },
              { id: `archive:${lot.lot_no}`, title: 'Archive' },
            ]
          );
        } catch (err) {
          console.error(`[scheduler] stale alert for ${lot.lot_no} failed:`, err.message);
        }
      }
      lots.markStaleNotified(lot.id);
    }
  }

  // 3. Automatic backup every Sunday (once per ISO week).
  if (whatsappEnabled) {
    const now = new Date();
    if (now.getUTCDay() === 0) {
      const weekKey = `${now.getUTCFullYear()}-${isoWeek(now)}`;
      if (getMeta('lastAutoBackupWeek') !== weekKey) {
        try {
          await runBackup('Automatic Sunday backup.');
          setMeta('lastAutoBackupWeek', weekKey);
        } catch (err) {
          console.error('[scheduler] Sunday backup failed:', err.message);
        }
      }
    }
  }
}

async function runBackup(caption) {
  const stamp = new Date().toISOString().slice(0, 10);
  for (const admin of whatsapp.adminNumbers) {
    await sendDocument(admin, DB_PATH, `amr-desk-${stamp}.sqlite`, caption);
  }
  console.log('[scheduler] backup sent');
}

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function start() {
  sweep().catch((e) => console.error('[scheduler] sweep failed:', e.message));
  setInterval(() => {
    sweep().catch((e) => console.error('[scheduler] sweep failed:', e.message));
  }, SWEEP_INTERVAL_MS).unref();
}

module.exports = { start, runBackup };
