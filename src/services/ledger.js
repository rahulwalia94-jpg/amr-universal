// The Ledger — sparse market notes, driven by markdown files in
// content/ledger/. Filename convention: YYYY-MM-DD-slug.md. Frontmatter:
//
//   ---
//   title: On testliner, and patience
//   date: 2026-07-01
//   summary: One line for the index and meta description.
//   ---
//
// Body is markdown, rendered with marked.

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const LEDGER_DIR = path.join(__dirname, '..', '..', 'content', 'ledger');

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

function allNotes() {
  if (!fs.existsSync(LEDGER_DIR)) return [];
  return fs
    .readdirSync(LEDGER_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(LEDGER_DIR, f), 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const slug = f.replace(/\.md$/, '');
      return {
        slug,
        title: meta.title || slug,
        date: meta.date || slug.slice(0, 10),
        summary: meta.summary || '',
        html: marked.parse(body),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function noteBySlug(slug) {
  return allNotes().find((n) => n.slug === slug) || null;
}

module.exports = { allNotes, noteBySlug };
