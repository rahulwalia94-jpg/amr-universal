// Minimal admin surface, protected by ADMIN_TOKEN.
//   GET /admin/subscribers.csv?token=…  — weekly export of the Wire list
//   GET /admin/leads.csv?token=…        — captured enquiries and reveals

const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { ADMIN_TOKEN } = require('../config');

const router = express.Router();

function authed(req) {
  const supplied = String(req.query.token || req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!ADMIN_TOKEN || !supplied) return false;
  const a = crypto.createHash('sha256').update(supplied).digest();
  const b = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}

const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

function sendCsv(res, filename, header, rows) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send([header.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n'));
}

router.get('/subscribers.csv', (req, res) => {
  if (!authed(req)) return res.status(403).send('Forbidden');
  const rows = db.prepare('SELECT email, confirmed, created_at FROM subscribers ORDER BY id').all();
  sendCsv(res, 'subscribers.csv', ['email', 'confirmed', 'subscribed_at'],
    rows.map((r) => [r.email, r.confirmed ? 'yes' : 'no', new Date(r.created_at).toISOString()]));
});

router.get('/leads.csv', (req, res) => {
  if (!authed(req)) return res.status(403).send('Forbidden');
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  sendCsv(res, 'leads.csv',
    ['when', 'source', 'lot_no', 'name', 'company', 'contact', 'material', 'quantity', 'message'],
    rows.map((r) => [new Date(r.created_at).toISOString(), r.source, r.lot_no, r.name, r.company, r.contact, r.material, r.quantity, r.message]));
});

module.exports = router;
