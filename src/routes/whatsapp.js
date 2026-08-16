// WhatsApp Business Cloud API webhook.
//   GET  /whatsapp/webhook — Meta's verification handshake
//   POST /whatsapp/webhook — inbound messages, signature-checked
//
// Only whitelisted admin numbers can manage the desk. Everyone else gets
// one polite refusal, then silence.

const express = require('express');
const { db, getMeta, setMeta } = require('../db');
const config = require('../config');
const lots = require('../services/lots');
const parser = require('../services/parser');
const wa = require('../services/whatsapp');
const scheduler = require('../services/scheduler');

const router = express.Router();

// ---- Verification handshake ----
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === config.whatsapp.verifyToken) {
    console.log('[whatsapp] webhook verified by Meta');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---- Inbound messages ----
router.post('/webhook', (req, res) => {
  if (!config.whatsappEnabled) {
    console.warn('[whatsapp] webhook POST received but WhatsApp is not configured');
    return res.sendStatus(200);
  }
  const signature = req.get('X-Hub-Signature-256');
  if (!wa.verifySignature(req.rawBody || Buffer.alloc(0), signature)) {
    console.warn('[whatsapp] rejected POST with bad or missing signature');
    return res.sendStatus(403);
  }
  // Acknowledge immediately; Meta retries on slow responses.
  res.sendStatus(200);
  handlePayload(req.body).catch((err) =>
    console.error('[whatsapp] handler error:', err.message)
  );
});

async function handlePayload(body) {
  const entries = body && body.entry ? body.entry : [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      for (const message of (change.value && change.value.messages) || []) {
        await handleMessage(message);
      }
    }
  }
}

async function handleMessage(message) {
  const from = String(message.from || '').replace(/^\+/, '');

  if (!config.whatsapp.adminNumbers.includes(from)) {
    // One polite refusal, then silence.
    const key = `refused:${from}`;
    if (!getMeta(key)) {
      setMeta(key, Date.now());
      await wa.sendText(
        from,
        'Thank you for your message. This number handles desk administration only. ' +
          `For enquiries, kindly use ${config.BASE_URL}/contact — the desk responds promptly.`
      );
    }
    return;
  }

  try {
    if (message.type === 'interactive') return await handleButton(from, message);
    if (message.type === 'image') return await handleImage(from, message);
    if (message.type === 'text') return await handleText(from, message.text.body);
    await wa.sendText(from, 'I handle text commands and photos. Send HELP for the cheat sheet.');
  } catch (err) {
    console.error('[whatsapp] command failed:', err.message);
    await wa.sendText(from, `Something went wrong handling that: ${err.message}. Send HELP if useful.`).catch(() => {});
  }
}

// ---- Text commands ----
async function handleText(from, text) {
  const cmd = parser.parse(text);

  switch (cmd.command) {
    case 'create':
      return startDraft(from, cmd.fields);

    case 'amend':
      return amendDraft(from, cmd.fields);

    case 'list': {
      const sale = lots.liveLots('sale');
      const wanted = lots.liveLots('wanted');
      if (!sale.length && !wanted.length) return wa.sendText(from, 'The board is empty.');
      const linesOut = [];
      if (sale.length) linesOut.push('*Lots available*', ...sale.map(lots.summaryLine));
      if (wanted.length) linesOut.push('', '*Material wanted*', ...wanted.map(lots.summaryLine));
      return wa.sendText(from, linesOut.join('\n'));
    }

    case 'close': {
      const lot = lots.markPlaced(cmd.lotNo);
      if (!lot) return wa.sendText(from, `${cmd.lotNo} is not on the live board.`);
      return wa.sendText(from, `${lot.lot_no} marked PLACED. It carries the ribbon for 48 hours, then leaves the board quietly.`);
    }

    case 'remove': {
      const lot = lots.archiveLot(cmd.lotNo);
      if (!lot) return wa.sendText(from, `I do not know ${cmd.lotNo}.`);
      return wa.sendText(from, `${lot.lot_no} removed from the board.`);
    }

    case 'edit': {
      const lot = lots.updateLot(cmd.lotNo, cmd.fields);
      if (!lot) return wa.sendText(from, `I do not know ${cmd.lotNo}.`);
      const changed = Object.keys(cmd.fields).join(', ');
      return wa.sendText(from, `${lot.lot_no} updated (${changed}).\n\n${previewText(lot)}`);
    }

    case 'backup':
      await wa.sendText(from, 'Preparing the database copy…');
      return scheduler.runBackup('Desk backup, on request.');

    case 'help':
      return wa.sendText(from, parser.HELP_TEXT);

    case 'error':
      return wa.sendText(from, cmd.message);

    default:
      return wa.sendText(from, 'I did not follow that. Send HELP for the cheat sheet.');
  }
}

// ---- Draft / confirmation flow ----
// Nothing goes live unpublished: every SELL/WANT becomes a draft, the bot
// replies with an exact preview, and the trader presses Publish.

function activeDraft(sender) {
  return db
    .prepare('SELECT * FROM drafts WHERE sender = ? ORDER BY id DESC LIMIT 1')
    .get(sender);
}

function clearDrafts(sender) {
  db.prepare('DELETE FROM drafts WHERE sender = ?').run(sender);
}

async function startDraft(from, fields) {
  if (!fields.title) {
    return wa.sendText(from, 'I need at least a title. Example:\nSELL\nTitle: Testliner 2, reels\nQty: 200 MT');
  }
  clearDrafts(from); // one open draft per sender keeps the flow unambiguous
  const info = db
    .prepare('INSERT INTO drafts (sender, payload, created_at) VALUES (?, ?, ?)')
    .run(from, JSON.stringify(fields), Date.now());
  return sendPreview(from, info.lastInsertRowid, fields);
}

async function amendDraft(from, fields) {
  const draft = activeDraft(from);
  if (!draft) {
    return wa.sendText(from, 'No draft is open. Start with SELL or WANT — or send HELP.');
  }
  const merged = { ...JSON.parse(draft.payload), ...fields };
  db.prepare("UPDATE drafts SET payload = ?, state = 'preview' WHERE id = ?")
    .run(JSON.stringify(merged), draft.id);
  return sendPreview(from, draft.id, merged);
}

function previewText(f) {
  const board = f.kind === 'wanted' ? 'Material Wanted' : 'Lots Available';
  const cat = (f.category || 'paper') === 'metals' ? 'METALS' : 'PAPER & BOARD';
  const rows = [
    `*${f.title || 'Untitled'}*`,
    `Board: ${board} · ${cat}`,
    f.origin ? `Origin: ${f.origin}` : null,
    f.quantity ? `Quantity: ${f.quantity}` : null,
    f.spec ? `Spec (private until requested): ${f.spec}` : null,
    `Price shown publicly: Price on application` + (f.price ? `\nPrice (private): ${f.price}` : ''),
    f.notes ? `Notes (private): ${f.notes}` : null,
    f.photo ? 'Photo: attached ✓' : 'Photo: none (send one now to attach it)',
  ].filter(Boolean);
  return rows.join('\n');
}

async function sendPreview(from, draftId, fields) {
  const lotOrEntry = fields.kind === 'wanted' ? 'entry' : 'lot';
  await wa.sendButtons(
    from,
    `Here is the ${lotOrEntry} exactly as the site will carry it:\n\n${previewText(fields)}\n\nNothing goes live until you press Publish.`,
    [
      { id: `publish:${draftId}`, title: 'Publish' },
      { id: `editdraft:${draftId}`, title: 'Edit' },
      { id: `cancel:${draftId}`, title: 'Cancel' },
    ]
  );
}

// ---- Interactive button replies ----
async function handleButton(from, message) {
  const reply = message.interactive && (message.interactive.button_reply || message.interactive.list_reply);
  if (!reply) return;
  const [action, ref] = String(reply.id).split(':');

  switch (action) {
    case 'publish': {
      const draft = db.prepare('SELECT * FROM drafts WHERE id = ? AND sender = ?').get(ref, from);
      if (!draft) return wa.sendText(from, 'That draft has gone. Start again with SELL or WANT.');
      const lot = lots.createLot(JSON.parse(draft.payload));
      clearDrafts(from);
      return wa.sendText(
        from,
        `Published. ${lot.lot_no} is live on the board now:\n${config.BASE_URL}/live-desk#${lot.lot_no}`
      );
    }
    case 'editdraft': {
      db.prepare("UPDATE drafts SET state = 'editing' WHERE id = ? AND sender = ?").run(ref, from);
      return wa.sendText(
        from,
        'Send the lines to change, e.g.\nPrice: USD 410/MT CIF\nQty: 180 MT\n\nI shall re-send the preview.'
      );
    }
    case 'cancel': {
      clearDrafts(from);
      return wa.sendText(from, 'Cancelled. Nothing was published.');
    }
    case 'renew': {
      const lot = lots.renewLot(ref);
      return wa.sendText(from, lot ? `${lot.lot_no} renewed — fresh for another 21 days.` : `I do not know ${ref}.`);
    }
    case 'archive': {
      const lot = lots.archiveLot(ref);
      return wa.sendText(from, lot ? `${lot.lot_no} archived.` : `I do not know ${ref}.`);
    }
    default:
      return wa.sendText(from, 'That button no longer does anything.');
  }
}

// ---- Photos ----
// A photo with a SELL/WANT caption starts a draft with the photo attached.
// A bare photo attaches to the open draft, or to the sender's most recent
// lot published in the last 15 minutes.
async function handleImage(from, message) {
  const mediaId = message.image && message.image.id;
  if (!mediaId) return;
  const caption = (message.image && message.image.caption) || '';

  const filename = await wa.downloadMedia(mediaId, 'lot');

  if (caption.trim()) {
    const cmd = parser.parse(caption);
    if (cmd.command === 'create') {
      cmd.fields.photo = filename;
      return startDraft(from, cmd.fields);
    }
  }

  const draft = activeDraft(from);
  if (draft) {
    const merged = { ...JSON.parse(draft.payload), photo: filename };
    db.prepare('UPDATE drafts SET payload = ? WHERE id = ?').run(JSON.stringify(merged), draft.id);
    return sendPreview(from, draft.id, merged);
  }

  const recent = db
    .prepare("SELECT * FROM lots WHERE status = 'live' AND created_at > ? ORDER BY created_at DESC LIMIT 1")
    .get(Date.now() - 15 * 60 * 1000);
  if (recent) {
    lots.updateLot(recent.lot_no, { photo: filename });
    return wa.sendText(from, `Photo attached to ${recent.lot_no}.`);
  }

  return wa.sendText(from, 'I have the photo. Start a lot with SELL (or WANT) and I shall attach it — or caption the photo with the SELL message itself.');
}

module.exports = router;
