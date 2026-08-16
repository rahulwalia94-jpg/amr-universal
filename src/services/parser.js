// Command grammar for the WhatsApp desk. Parsed forgivingly — this is a
// trader typing with one thumb, not an engineer. Case-insensitive verbs,
// flexible field labels, colon or dash or plain-space separators.

const VERBS = {
  SELL: 'sell', OFFER: 'sell',
  WANT: 'wanted', BUY: 'wanted',
  LIST: 'list',
  SOLD: 'sold', FOUND: 'found',
  REMOVE: 'remove', DELETE: 'remove',
  EDIT: 'edit',
  BACKUP: 'backup',
  HELP: 'help',
};

// Accepted spellings for each field label, all case-insensitive.
const FIELD_ALIASES = {
  category: ['category', 'cat', 'desk', 'type'],
  title: ['title', 'grade', 'item', 'material', 'name', 'product'],
  origin: ['origin', 'from', 'location', 'loc', 'country'],
  quantity: ['quantity', 'qty', 'q', 'tonnage', 'volume', 'amount'],
  spec: ['spec', 'specs', 'specification', 'details', 'detail', 'description'],
  price: ['price', 'p', 'rate', 'value', 'ask', 'bid'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments', 'terms'],
};

const ALIAS_TO_FIELD = {};
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const a of aliases) ALIAS_TO_FIELD[a] = field;
}

const LOT_NO_RE = /AMR[-\s]?([PMW])[-\s]?(\d{1,6})/i;

function normaliseLotNo(text) {
  const m = String(text || '').match(LOT_NO_RE);
  if (!m) return null;
  return `AMR-${m[1].toUpperCase()}-${String(parseInt(m[2], 10)).padStart(4, '0')}`;
}

// Guess the desk when the trader doesn't label it. Metals words win only
// when clearly present; paper is the primary desk and the default.
const METAL_WORDS = /\b(steel|hms|shred\w*|alumin\w*|ubc|cast\s+iron|iron|copper|brass|billet\w*|extrusion\w*|casting\w*|wheels?|zorba|zurik|taint|tabor|troma)\b/i;

function guessCategory(text) {
  return METAL_WORDS.test(text) ? 'metals' : 'paper';
}

// Parse "Label: value" lines. Unlabelled first line becomes the title.
function parseFields(lines) {
  const fields = {};
  const unlabelled = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z ]{1,20}?)\s*[:\-–]\s*(.+)$/);
    if (m) {
      const key = ALIAS_TO_FIELD[m[1].trim().toLowerCase()];
      if (key) {
        fields[key] = fields[key] ? `${fields[key]} ${m[2].trim()}` : m[2].trim();
        continue;
      }
    }
    unlabelled.push(line);
  }
  if (!fields.title && unlabelled.length) fields.title = unlabelled.shift();
  if (unlabelled.length) {
    const extra = unlabelled.join(' · ');
    fields.notes = fields.notes ? `${fields.notes} · ${extra}` : extra;
  }
  if (fields.category) {
    fields.category = /met|steel|alu|iron|scrap/i.test(fields.category) ? 'metals' : 'paper';
  }
  return fields;
}

// Main entry. Returns { command, ...payload } or { command: 'unknown' }.
function parse(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { command: 'unknown' };

  const lines = trimmed.split(/\r?\n/);
  const firstLine = lines[0].trim();
  const verbWord = (firstLine.split(/\s+/)[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
  const verb = VERBS[verbWord];

  if (!verb) {
    // Bare "Field: value" lines — an amendment while a draft is open.
    const fields = parseFields(lines);
    if (Object.keys(fields).length) return { command: 'amend', fields };
    return { command: 'unknown' };
  }

  // Everything on the verb's own line after the verb word itself.
  const restOfFirst = firstLine.replace(/^\s*[A-Za-z]+[.,:!]?\s*/, '').trim();

  switch (verb) {
    case 'sell':
    case 'wanted': {
      const bodyLines = [...lines.slice(1)];
      if (restOfFirst) bodyLines.unshift(restOfFirst); // "SELL 200t testliner…" one-liner
      const fields = parseFields(bodyLines);
      if (!fields.category) fields.category = guessCategory(trimmed);
      fields.kind = verb === 'wanted' ? 'wanted' : 'sale';
      return { command: 'create', fields };
    }
    case 'sold':
    case 'found': {
      const lotNo = normaliseLotNo(trimmed);
      return lotNo ? { command: 'close', lotNo } : { command: 'error', message: 'I could not find a lot number in that. Example: SOLD AMR-P-0003' };
    }
    case 'remove': {
      const lotNo = normaliseLotNo(trimmed);
      return lotNo ? { command: 'remove', lotNo } : { command: 'error', message: 'I could not find a lot number in that. Example: REMOVE AMR-M-0001' };
    }
    case 'edit': {
      const lotNo = normaliseLotNo(trimmed);
      if (!lotNo) return { command: 'error', message: 'I could not find a lot number in that. Example: EDIT AMR-P-0004 Price: USD 410/MT CIF' };
      const afterLot = trimmed.replace(LOT_NO_RE, '').replace(/^\s*EDIT\s*/i, '');
      const fields = parseFields(afterLot.split(/\r?\n/));
      if (!Object.keys(fields).length) {
        return { command: 'error', message: 'Tell me what to change. Example: EDIT AMR-P-0004 Price: USD 410/MT CIF' };
      }
      return { command: 'edit', lotNo, fields };
    }
    case 'list': return { command: 'list' };
    case 'backup': return { command: 'backup' };
    case 'help': return { command: 'help' };
    default: return { command: 'unknown' };
  }
}

const HELP_TEXT = [
  '*AMR Desk — cheat sheet*',
  '',
  '*Post a lot for sale*',
  'SELL',
  'Title: Testliner 2, reels',
  'Origin: UK',
  'Qty: 200 MT',
  'Spec: 125–150 gsm, 1400mm',
  'Price: USD 410/MT CIF',
  'Notes: prompt shipment',
  '',
  '*Post material wanted* — WANT (same lines)',
  '*See the board* — LIST',
  '*Mark placed* — SOLD AMR-P-0003  /  FOUND AMR-W-0002',
  '*Take down* — REMOVE AMR-M-0001',
  '*Amend one field* — EDIT AMR-P-0004 Price: USD 410/MT CIF',
  '*Database copy* — BACKUP',
  '',
  'Attach a photo to your SELL message (or send it right after) and it joins the lot.',
  'Nothing goes live until you press *Publish* on the preview.',
].join('\n');

module.exports = { parse, parseFields, normaliseLotNo, HELP_TEXT };
