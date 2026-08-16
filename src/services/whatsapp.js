// Official Meta WhatsApp Business Cloud API client. Nothing unofficial —
// no whatsapp-web.js, no Baileys. Uses Node's native fetch/FormData/Blob.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { whatsapp, whatsappEnabled, MEDIA_DIR } = require('../config');

const GRAPH = 'https://graph.facebook.com/v21.0';

async function graphPost(payload) {
  if (!whatsappEnabled) {
    console.warn('[whatsapp] send skipped — WhatsApp not configured');
    return null;
  }
  const res = await fetch(`${GRAPH}/${whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error ? JSON.stringify(body.error) : `HTTP ${res.status}`;
    throw new Error(`WhatsApp send failed: ${msg}`);
  }
  return body;
}

function sendText(to, text) {
  return graphPost({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text.slice(0, 4096) },
  });
}

// Interactive reply buttons — max 3, ids come back in button_reply.id.
function sendButtons(to, bodyText, buttons) {
  return graphPost({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

// Upload a local file to the media endpoint, then send it as a document.
// Used by the BACKUP command to return the SQLite file.
async function sendDocument(to, filePath, filename, caption) {
  if (!whatsappEnabled) return null;
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', new Blob([buffer], { type: 'application/octet-stream' }), filename);
  const up = await fetch(`${GRAPH}/${whatsapp.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${whatsapp.accessToken}` },
    body: form,
  });
  const upBody = await up.json().catch(() => ({}));
  if (!up.ok) throw new Error(`Media upload failed: ${JSON.stringify(upBody.error || up.status)}`);
  return graphPost({
    messaging_product: 'whatsapp',
    to,
    type: 'document',
    document: { id: upBody.id, filename, caption },
  });
}

// Download an inbound media item (lot photo) to MEDIA_DIR.
// Returns the stored filename. A random suffix keeps URLs unguessable,
// since photos are only revealed after a details request.
async function downloadMedia(mediaId, hint = 'photo') {
  const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${whatsapp.accessToken}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok || !meta.url) throw new Error(`Media lookup failed for ${mediaId}`);
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${whatsapp.accessToken}` },
  });
  if (!fileRes.ok) throw new Error(`Media download failed for ${mediaId}`);
  const buf = Buffer.from(await fileRes.arrayBuffer());
  const ext = (meta.mime_type || '').includes('png') ? 'png' : 'jpg';
  const name = `${hint}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(MEDIA_DIR, name), buf);
  return name;
}

// Verify Meta's X-Hub-Signature-256 header against the raw request body.
function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !whatsapp.appSecret) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', whatsapp.appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { sendText, sendButtons, sendDocument, downloadMedia, verifySignature };
