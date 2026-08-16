// Public JSON API consumed by the Live Desk page (45s polling) and the
// site's forms. Tiered visibility: list endpoints return the public card
// fields only; full detail requires a details request that captures a lead.

const express = require('express');
const { db } = require('../db');
const lots = require('../services/lots');
const { queueForAdmins } = require('../services/notify');
const { rateLimit } = require('../util/ratelimit');

const router = express.Router();

router.get('/offers', (req, res) => {
  res.json({ ok: true, lots: lots.liveLots('sale').map(lots.publicView) });
});

router.get('/wanted', (req, res) => {
  res.json({ ok: true, lots: lots.liveLots('wanted').map(lots.publicView) });
});

const clean = (v, max = 300) => String(v == null ? '' : v).trim().slice(0, max);

// "Request full details" — reveals spec/price/photo, logs the lead, and
// pushes it to the owner's WhatsApp immediately.
router.post('/reveal', rateLimit({ max: 20 }), (req, res) => {
  const { lot_no, name, company, contact, website } = req.body || {};
  if (clean(website)) return res.json({ ok: true, ignored: true }); // honeypot
  const lot = lots.getByLotNo(clean(lot_no, 20));
  if (!lot || !['live', 'placed'].includes(lot.status)) {
    return res.status(404).json({ ok: false, error: 'That lot is no longer on the board.' });
  }
  if (!clean(name) || !clean(contact)) {
    return res.status(400).json({ ok: false, error: 'A name and an email or WhatsApp number are required.' });
  }
  db.prepare(
    'INSERT INTO leads (source, lot_no, name, company, contact, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('reveal', lot.lot_no, clean(name), clean(company), clean(contact), Date.now());

  queueForAdmins(
    [
      `*Details requested — ${lot.lot_no}*`,
      lot.title,
      '',
      `Name: ${clean(name)}`,
      clean(company) ? `Company: ${clean(company)}` : null,
      `Contact: ${clean(contact)}`,
    ].filter(Boolean).join('\n')
  );

  res.json({ ok: true, lot: lots.fullView(lot) });
});

// Contact-page enquiry form. Honeypot + rate limit, no CAPTCHA.
router.post('/enquiry', rateLimit({ max: 8 }), (req, res) => {
  const { name, company, material, quantity, message, contact, website } = req.body || {};
  if (clean(website)) return res.json({ ok: true }); // honeypot — pretend success
  if (!clean(name) || !clean(contact) || !clean(message, 2000)) {
    return res.status(400).json({ ok: false, error: 'Name, contact and message are required.' });
  }
  db.prepare(
    'INSERT INTO leads (source, name, company, contact, material, quantity, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run('enquiry', clean(name), clean(company), clean(contact), clean(material), clean(quantity), clean(message, 2000), Date.now());

  queueForAdmins(
    [
      '*Website enquiry*',
      `Name: ${clean(name)}`,
      clean(company) ? `Company: ${clean(company)}` : null,
      `Contact: ${clean(contact)}`,
      clean(material) ? `Material: ${clean(material)}` : null,
      clean(quantity) ? `Quantity: ${clean(quantity)}` : null,
      '',
      clean(message, 2000),
    ].filter(Boolean).join('\n')
  );

  res.json({ ok: true });
});

// The Wire — lot-sheet subscription. Double-opt-in-ready structure;
// mail sending is a later integration.
router.post('/subscribe', rateLimit({ max: 8 }), (req, res) => {
  const email = clean(req.body && req.body.email, 200).toLowerCase();
  if (clean(req.body && req.body.website)) return res.json({ ok: true }); // honeypot
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'A valid email address is required.' });
  }
  const token = require('crypto').randomBytes(16).toString('hex');
  db.prepare(
    'INSERT INTO subscribers (email, confirm_token, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING'
  ).run(email, token, Date.now());
  res.json({ ok: true });
});

module.exports = router;
