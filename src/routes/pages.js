// Server-rendered pages. Every view receives the company config, the base
// URL and a `page` object carrying title/description/path for SEO tags.

const express = require('express');
const company = require('../company-config');
const config = require('../config');
const lots = require('../services/lots');
const ledger = require('../services/ledger');

const router = express.Router();

router.use((req, res, next) => {
  res.locals.company = company;
  res.locals.BASE_URL = config.BASE_URL;
  res.locals.year = new Date().getFullYear();
  next();
});

const render = (res, view, page, extra = {}) => res.render(view, { page, ...extra });

router.get('/', (req, res) => {
  render(res, 'home', {
    title: 'AMR Universal LTD · International Paper, Board & Metals Trading',
    description:
      'AMR Universal LTD trades paper, board and secondary metals across the UK, Europe and North America. Prime reels, stocklots, kraft, testliner; scrap steel and aluminium. Buyers of redundant stock.',
    path: '/',
  }, {
    latestLots: lots.liveLots('sale').slice(0, 4).map(lots.publicView),
    latestWanted: lots.liveLots('wanted').slice(0, 3).map(lots.publicView),
  });
});

router.get('/the-house', (req, res) => {
  render(res, 'house', {
    title: 'The House · AMR Universal LTD',
    description:
      'A discreet, relationship-driven trading house moving physical commodity between mills, printers, converters, foundries and yards on three continents.',
    path: '/the-house',
  });
});

router.get('/paper-and-board', (req, res) => {
  render(res, 'paper', {
    title: 'Paper & Board · AMR Universal LTD — Stocklots, Testliner, Kraft, Woodfree',
    description:
      'Paper stocklot supplier to the UK and Europe: prime reels and sheets, side-runs, testliner, fluting, kraft, coated and uncoated woodfree, boards. We buy redundant and surplus stock and collect anywhere in the UK and Europe.',
    path: '/paper-and-board',
  });
});

router.get('/metals', (req, res) => {
  render(res, 'metals', {
    title: 'Metals · AMR Universal LTD — Scrap Steel, Aluminium, Cast Iron',
    description:
      'Scrap steel trading UK and aluminium scrap export: HMS 1&2, shredded, plate and structural, extrusions, castings, UBC, wheels, cast iron. Ferrous and non-ferrous, traded with the same discipline as our paper desk.',
    path: '/metals',
  });
});

router.get('/live-desk', (req, res) => {
  const offers = lots.liveLots('sale').map(lots.publicView);
  const wanted = lots.liveLots('wanted').map(lots.publicView);
  render(res, 'live-desk', {
    title: 'Live Desk · AMR Universal LTD — Lots Available & Material Wanted',
    description:
      'The current book: paper, board and metals lots available for sale, and material the house is buying. Updated live from the trading desk.',
    path: '/live-desk',
  }, { offers, wanted });
});

router.get('/ledger', (req, res) => {
  render(res, 'ledger', {
    title: 'The Ledger · AMR Universal LTD — Market Notes',
    description:
      'Occasional notes from the desk on paper and board indices, scrap sentiment and freight. Written briefly, in plain terms.',
    path: '/ledger',
  }, { notes: ledger.allNotes() });
});

router.get('/ledger/:slug', (req, res, next) => {
  const note = ledger.noteBySlug(req.params.slug);
  if (!note) return next();
  render(res, 'ledger-post', {
    title: `${note.title} · The Ledger · AMR Universal LTD`,
    description: note.summary || note.title,
    path: `/ledger/${note.slug}`,
  }, { note });
});

router.get('/terms-of-trade', (req, res) => {
  render(res, 'terms', {
    title: 'Terms of Trade · AMR Universal LTD',
    description:
      'Indicative terms of trade: Incoterms handled, payment instruments, inspection and claims procedure, jurisdiction. Every contract concluded individually.',
    path: '/terms-of-trade',
  });
});

router.get('/contact', (req, res) => {
  render(res, 'contact', {
    title: 'Contact · AMR Universal LTD',
    description:
      'Enquiries to the desk: paper, board and metals, buying and selling. London, Rotterdam, New York.',
    path: '/contact',
  });
});

router.get('/privacy', (req, res) => {
  render(res, 'privacy', {
    title: 'Privacy & Cookies · AMR Universal LTD',
    description: 'How AMR Universal LTD handles personal data. No tracking cookies, no analytics.',
    path: '/privacy',
  });
});

router.get('/terms-of-use', (req, res) => {
  render(res, 'terms-of-use', {
    title: 'Website Terms of Use · AMR Universal LTD',
    description: 'Terms governing the use of this website.',
    path: '/terms-of-use',
  });
});

// ---- SEO plumbing ----
router.get('/sitemap.xml', (req, res) => {
  const staticPaths = [
    '/', '/the-house', '/paper-and-board', '/metals', '/live-desk',
    '/ledger', '/terms-of-trade', '/contact', '/privacy', '/terms-of-use',
  ];
  const urls = [
    ...staticPaths.map((p) => `${config.BASE_URL}${p}`),
    ...ledger.allNotes().map((n) => `${config.BASE_URL}/ledger/${n.slug}`),
  ];
  res.set('Content-Type', 'application/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
      `\n</urlset>`
  );
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${config.BASE_URL}/sitemap.xml\n`
  );
});

module.exports = router;
