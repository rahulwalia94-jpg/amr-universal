// Seed the desk with realistic sample lots so the site launches looking
// traded-in, not empty. Runs automatically on first boot (server.js calls
// seedIfEmpty) and can be run by hand: npm run seed.

const { db, getMeta, setMeta } = require('./db');
const lots = require('./services/lots');

const SAMPLE_LOTS = [
  // ---- Paper (4) ----
  {
    kind: 'sale', category: 'paper',
    title: 'Testliner 2, prime reels',
    origin: 'United Kingdom',
    quantity: '210 MT',
    spec: '125–150 gsm, widths 1400–2100 mm, mill-wrapped, full production run. Reels on ends, mill labels intact.',
    price: 'On application — CIF main port quoted on enquiry',
    notes: 'Prompt shipment ex UK mill. Regular monthly volume available against contract.',
  },
  {
    kind: 'sale', category: 'paper',
    title: 'Coated woodfree sheets, stocklot',
    origin: 'Germany',
    quantity: '96 MT',
    spec: '130 gsm, 640 × 900 mm, wrapped on pallets. Single-lot clearance, consistent make, stored dry.',
    price: 'On application',
    notes: 'Sold as stocklot without mill guarantee. Inspection welcome at store, Rhine-Ruhr.',
  },
  {
    kind: 'sale', category: 'paper',
    title: 'Kraftliner side-runs',
    origin: 'Sweden',
    quantity: '140 MT, ongoing',
    spec: '175–200 gsm, widths 600–1150 mm, unprinted. Continuous availability from a single mill relationship.',
    price: 'On application',
    notes: 'Monthly programme preferred over spot. FSC-certified material available on request.',
  },
  {
    kind: 'sale', category: 'paper',
    title: 'Unprinted white waste, baled',
    origin: 'United Kingdom',
    quantity: '300 MT/month',
    spec: 'Converter offcuts, guillotine trim, wire-baled approx. 550 kg. Consistent furnish, no mechanical content.',
    price: 'On application',
    notes: 'Loading UK Midlands. Regular weekly collections in place; additional tonnage available.',
  },
  // ---- Metals (2) ----
  {
    kind: 'sale', category: 'metals',
    title: 'HMS 1&2 (80:20)',
    origin: 'United Kingdom',
    quantity: '500 MT, monthly',
    spec: 'ISRI 200-206 basis, max 1.5 m × 0.5 m × 0.5 m, prepared. Loading in containers or bulk.',
    price: 'On application — basis CFR quoted against destination',
    notes: 'Photographs of current stock available on request. Weighbridge tickets supplied.',
  },
  {
    kind: 'sale', category: 'metals',
    title: 'Aluminium extrusions 6063, bare',
    origin: 'Netherlands',
    quantity: '44 MT',
    spec: 'Clean production offcuts, paint-free, sawn lengths under 1 m, in bundles. Two container loads.',
    price: 'On application',
    notes: 'Material at store, Rotterdam. Assay on request.',
  },
];

const SAMPLE_WANTED = [
  {
    kind: 'wanted', category: 'paper',
    title: 'Redundant and surplus board stock — any grade',
    origin: 'UK & Europe',
    quantity: 'Any volume from one pallet to full stock clearances',
    spec: 'Folding boxboard, testliner, fluting, coated and uncoated grades. Aged, over-made, redundant or customer-rejected stock all considered.',
    price: 'Fair open-market offers, paid promptly',
    notes: 'We collect anywhere in the UK and Europe with our own arranged haulage. Discretion assured.',
  },
  {
    kind: 'wanted', category: 'metals',
    title: 'Cast iron — machine shop and demolition arisings',
    origin: 'United Kingdom',
    quantity: '100 MT/month, ongoing',
    spec: 'Clean cast, machinery breaks, engine blocks drained of fluids. No burnt or contaminated material.',
    price: 'Competitive, settled on weighbridge weights',
    notes: 'Regular collections arranged. Long-term supply relationships preferred.',
  },
];

function seedIfEmpty() {
  if (getMeta('seeded')) return false;
  const count = db.prepare('SELECT COUNT(*) AS c FROM lots').get().c;
  if (count > 0) {
    setMeta('seeded', '1');
    return false;
  }
  // Metals first, paper last — the home page shows the newest lots, and the
  // paper desk leads the house.
  const ordered = [...SAMPLE_LOTS].sort((a, b) =>
    a.category === b.category ? 0 : a.category === 'metals' ? -1 : 1
  );
  for (const lot of [...ordered, ...SAMPLE_WANTED]) lots.createLot(lot);
  setMeta('seeded', '1');
  console.log(`[seed] created ${SAMPLE_LOTS.length + SAMPLE_WANTED.length} sample lots`);
  return true;
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  seedIfEmpty();
  console.log('[seed] done');
}
