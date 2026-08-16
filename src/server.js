// AMR Universal — single Node.js + Express app serving the website,
// the JSON API, the admin exports and the WhatsApp webhook.

const path = require('path');
const express = require('express');
const config = require('./config');
const { seedIfEmpty } = require('./seed');
const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');
const whatsappRouter = require('./routes/whatsapp');
const notify = require('./services/notify');
const scheduler = require('./services/scheduler');

const app = express();
app.set('trust proxy', 1); // Render terminates TLS in front of the app
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Keep the raw body for webhook signature verification.
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.pdf')) res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  })
);
// Lot photos (unguessable filenames; URLs handed out only after a details request).
app.use('/media', express.static(config.MEDIA_DIR, { maxAge: '1d' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, whatsapp: config.whatsappEnabled, time: new Date().toISOString() });
});

app.use('/whatsapp', whatsappRouter);
app.use('/api', apiRouter);
app.use('/admin', adminRouter);
app.use('/', pagesRouter);

// 404 in the house style.
app.use((req, res) => {
  if (!res.locals.company) return res.status(404).send('Not found'); // non-GET stray requests
  res.status(404).render('404', {
    page: { title: 'Not found · AMR Universal LTD', description: 'Page not found.', path: req.path },
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).send('The desk is momentarily unavailable.');
});

seedIfEmpty();
notify.startRetryLoop();
scheduler.start();

app.listen(config.PORT, () => {
  console.log(`[server] AMR Universal listening on port ${config.PORT}`);
  console.log(`[server] base URL: ${config.BASE_URL}`);
  console.log(`[server] data dir: ${config.DATA_DIR}`);
  console.log(`[server] WhatsApp desk: ${config.whatsappEnabled ? 'configured' : 'NOT configured (degraded mode)'}`);
});
