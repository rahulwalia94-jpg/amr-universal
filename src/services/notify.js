// Outbound WhatsApp pushes to the owner: enquiry-form submissions,
// "request full details" events, stale-lot alerts. This is the
// highest-value path in the build, so every push goes through a durable
// queue — a failed send is logged and retried, never dropped.

const { db } = require('../db');
const { whatsapp, whatsappEnabled } = require('../config');
const { sendText } = require('./whatsapp');

const MAX_ATTEMPTS = 10;
const RETRY_INTERVAL_MS = 60 * 1000;

// Queue a message to every admin number.
function queueForAdmins(body) {
  if (!whatsappEnabled) {
    console.warn('[notify] WhatsApp not configured — notification recorded but not sent:\n' + body);
  }
  const now = Date.now();
  const stmt = db.prepare(
    'INSERT INTO notifications (to_number, body, created_at) VALUES (?, ?, ?)'
  );
  const targets = whatsapp.adminNumbers.length ? whatsapp.adminNumbers : ['unconfigured'];
  for (const num of targets) stmt.run(num, body, now);
  // Try immediately rather than waiting for the next sweep.
  processQueue().catch((e) => console.error('[notify] immediate send failed:', e.message));
}

async function processQueue() {
  if (!whatsappEnabled) return;
  const pending = db
    .prepare("SELECT * FROM notifications WHERE status = 'queued' AND attempts < ? ORDER BY id LIMIT 20")
    .all(MAX_ATTEMPTS);
  for (const n of pending) {
    if (n.to_number === 'unconfigured') continue;
    try {
      await sendText(n.to_number, n.body);
      db.prepare("UPDATE notifications SET status = 'sent', sent_at = ?, attempts = attempts + 1 WHERE id = ?")
        .run(Date.now(), n.id);
    } catch (err) {
      const attempts = n.attempts + 1;
      const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'queued';
      db.prepare('UPDATE notifications SET attempts = ?, last_error = ?, status = ? WHERE id = ?')
        .run(attempts, String(err.message).slice(0, 500), status, n.id);
      console.error(`[notify] send to ${n.to_number} failed (attempt ${attempts}):`, err.message);
    }
  }
}

function startRetryLoop() {
  setInterval(() => {
    processQueue().catch((e) => console.error('[notify] retry sweep failed:', e.message));
  }, RETRY_INTERVAL_MS).unref();
}

module.exports = { queueForAdmins, processQueue, startRetryLoop };
