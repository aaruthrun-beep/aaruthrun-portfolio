/**
 * AARUTHRUN PORTFOLIO — SHARE CARDS
 *
 * One 1200x630 link-preview card per project and per published field note, so a
 * shared link shows the build or the note itself — its photograph or blueprint
 * field, its name and a line of detail — rather than the portrait card used for
 * the site.
 *
 *   data/projects.json  ->  images/og/project-<slug>.jpg
 *   data/journal.json   ->  images/og/note-<slug>.jpg
 *
 * CENTRE-SAFE LAYOUT
 * Telegram and Twitter show the whole 1.91:1 rectangle. WhatsApp does not: its
 * link preview is a square, cut from the centre of the image, so a card with
 * the text on the left and the photo on the right loses half of both. Every
 * element therefore lives inside the centre 630x630 square (x 285..915), which
 * is the only part WhatsApp keeps:
 *
 *   +-----------------------------------+
 *   |      |                    |       |
 *   |      |  kicker            |       |
 *   |      |  NAME              |       |
 *   |      |  ---               | photo |
 *   |      |  detail line       |       |
 *   |      |  site              |       |
 *   |      |                    |       |
 *   +-----------------------------------+
 *
 * Photographs bleed the full width, so the wide view gains picture at the sides
 * and the square view keeps the same composition. A note without a photographic
 * cover gets a blueprint field instead of a photograph, in the same palette.
 *
 * Photographs are the web-sized derivatives (the originals in images/projects
 * run up to 16 MB, which unfurlers time out on). Cards are encoded as baseline
 * JPEGs for the same reason as the portrait card: WhatsApp's thumbnailer paints
 * progressive JPEGs as a black rectangle.
 *
 * Run: node tools/make-share-cards.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'images/og');

const W = 1200;
const H = 630;

/* WhatsApp's square crop, centred. Everything that must be read goes here. */
const SAFE = 630;
const SAFE_PAD = 60;
const TEXT_MAX_WIDTH = SAFE - SAFE_PAD * 2;

const INK = '#151917';
const CREAM = '#F7F5EE';
const GOLD = '#D9AE63';
const MUTED = '#D5D9D3';

const SITE = 'aaruthrun-beep.github.io/aaruthrun-portfolio';
const RASTER = /\.(jpe?g|png|webp)$/i;

/* Shared block geometry: measured top-down from the small gold rule. */
const RULE_H = 4;
const KICKER_OFFSET = 40; // rule top -> kicker baseline
const TITLE_OFFSET = 118; // rule top -> first title baseline
const RULE_GAP = 34; // last title baseline -> divider top
const BODY_GAP = 48; // divider top -> first body baseline
const TAIL = 12; // descender room under the last body baseline

const exists = (rel) => Boolean(rel) && fs.existsSync(path.join(ROOT, rel));

const esc = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const oneLine = (value) => String(value || '').replace(/\s+/g, ' ').trim();

/* -------------------------------------------------------------------------- */
/* Text fitting                                                               */
/* -------------------------------------------------------------------------- */

// sharp lays text out itself, so fitting is estimated from an average glyph
// advance rather than measured. Serif display faces run a little under 0.55em.
function wrapWords(text, size, maxWidth, factor) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (size * factor)));
  const words = oneLine(text).split(' ').filter(Boolean);
  const lines = [];

  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + ' ' + word).length <= maxChars) {
      lines[lines.length - 1] = last + ' ' + word;
    } else {
      lines.push(word);
    }
  }
  return { lines, maxChars };
}

// Fit a headline to a column by stepping the size down until it needs no more
// than `maxLines`; anything still spilling over is cut with an ellipsis.
function fitTitle(text, sizes, maxWidth, maxLines) {
  let result = null;
  for (const [size, leading] of sizes) {
    const wrapped = wrapWords(text, size, maxWidth, 0.53);
    result = { ...wrapped, size, leading };
    if (wrapped.lines.length <= maxLines) return result;
  }

  const lines = result.lines.slice(0, maxLines);
  const lastIndex = lines.length - 1;
  if (lines[lastIndex].length > result.maxChars - 1) {
    const cut = lines[lastIndex].slice(0, result.maxChars - 1);
    const space = cut.lastIndexOf(' ');
    lines[lastIndex] = (space > 0 ? cut.slice(0, space) : cut).replace(/[,;:.]$/, '') + '…';
  }
  result.lines = lines;
  return result;
}

// Field-note subtitles are prose, so they wrap on spaces and are clipped rather
// than run into a fourth line.
function fitBody(text, size, leading, tracking, maxLines) {
  const wrapped = wrapWords(text, size, TEXT_MAX_WIDTH, 0.6);
  const lines = wrapped.lines.slice(0, maxLines);
  if (wrapped.lines.length > maxLines) {
    const lastIndex = lines.length - 1;
    const cut = lines[lastIndex].slice(0, wrapped.maxChars - 1);
    const space = cut.lastIndexOf(' ');
    lines[lastIndex] = (space > 0 ? cut.slice(0, space) : cut).replace(/[,;:.]$/, '') + '…';
  }
  return { lines, size, leading, tracking };
}

// The monospace specs are written as "segment // segment // segment", so wrap
// at the separators: a line never ends mid-spec and the "//" never opens one.
function wrapSpec(text, size, leading, tracking, maxLines) {
  const maxChars = Math.floor(TEXT_MAX_WIDTH / (size * 0.6 + tracking));
  const segments = oneLine(text).split(/\s*\/\/\s*/).filter(Boolean);
  const lines = [];

  for (const segment of segments) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + ' // ' + segment).length <= maxChars) {
      lines[lines.length - 1] = last + ' // ' + segment;
    } else {
      lines.push(segment);
    }
  }
  return { lines: lines.slice(0, maxLines), size, leading, tracking };
}

// "NITE 369 — Six-Axis Robotic Arm" reads as "NITE 369" on the card; the rest
// of the title is already implied by the spec line underneath.
function projectName(project) {
  const title = oneLine(project.shortTitle || project.title);
  const split = oneLine(project.title).split(' — ')[0];
  return title || split;
}

/* -------------------------------------------------------------------------- */
/* Composition                                                                */
/* -------------------------------------------------------------------------- */

function photoSource(project) {
  const archived = 'images/archive/' + project.slug + '.jpg';
  if (exists(archived)) return archived;
  if (RASTER.test(project.image || '') && exists(project.image)) return project.image;
  return null;
}

// A note's cover is only usable as a photograph when it is a raster image; the
// SVG covers are light technical plates with their own lettering on them, which
// would collide with the card's copy.
function notePhotoSource(entry) {
  if (RASTER.test(entry.cover || '') && exists(entry.cover)) return entry.cover;
  return null;
}

const dots = [];

async function photoMarkupFor(src) {
  if (!src) return '';

  // Full-bleed: covers the wide view, and the centre square still shows the
  // middle of the photograph rather than an empty margin.
  const photo = await sharp(path.join(ROOT, src))
    .rotate()
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86 })
    .toBuffer();

  return `<image xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"
         x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`;
}

function blueprintMarkup() {
  // No photograph: a faint grid on the ink field, so the card still reads as a
  // drawing rather than an empty panel.
  if (!dots.length) {
    for (let x = 0; x <= W; x += 40) dots.push(`<path d="M${x} 0V${H}"/>`);
    for (let y = 0; y <= H; y += 40) dots.push(`<path d="M0 ${y}H${W}"/>`);
  }
  return `<g stroke="${CREAM}" stroke-opacity="0.05" stroke-width="1">${dots.join('')}</g>`;
}

async function renderCard({ out, kicker, title, body, photo }) {
  const titleLines = title.lines;
  const bodyLines = body.lines;

  const blockHeight =
    TITLE_OFFSET +
    (titleLines.length - 1) * title.leading +
    RULE_GAP +
    BODY_GAP +
    (bodyLines.length - 1) * body.leading +
    TAIL;
  const top = Math.round((H - blockHeight) / 2);

  const kickerY = top + KICKER_OFFSET;
  const titleBase = top + TITLE_OFFSET;
  const dividerY = titleBase + (titleLines.length - 1) * title.leading + RULE_GAP;
  const bodyStart = dividerY + BODY_GAP;

  const titleMarkup = titleLines
    .map(
      (line, i) =>
        `  <text x="${W / 2}" y="${titleBase + i * title.leading}" text-anchor="middle" font-family="DM Serif Display, Georgia, 'Times New Roman', serif"
        font-size="${title.size}" letter-spacing="-1" fill="${CREAM}">${esc(line)}</text>`
    )
    .join('\n');

  const bodyMarkup = bodyLines
    .map(
      (line, i) =>
        `  <text x="${W / 2}" y="${bodyStart + i * body.leading}" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="${body.size}" letter-spacing="${body.tracking}" fill="${MUTED}">${esc(line)}</text>`
    )
    .join('\n');

  const photoMarkup = await photoMarkupFor(photo);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0E1110" stop-opacity="0.55"/>
      <stop offset="0.32" stop-color="#0E1110" stop-opacity="0.68"/>
      <stop offset="0.72" stop-color="#0E1110" stop-opacity="0.76"/>
      <stop offset="1" stop-color="#0E1110" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="edges" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0E1110" stop-opacity="0.42"/>
      <stop offset="0.5" stop-color="#0E1110" stop-opacity="0"/>
      <stop offset="1" stop-color="#0E1110" stop-opacity="0.42"/>
    </linearGradient>
    <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#0E1110" stop-opacity="0.62"/>
      <stop offset="0.62" stop-color="#0E1110" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#0E1110" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
${blueprintMarkup()}
${photoMarkup}
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <rect width="${W}" height="${H}" fill="url(#edges)"/>

  <!-- A soft dark pool under the copy, so the detail line stays legible over a
       busy render without a visible plate edge. -->
  <ellipse cx="${W / 2}" cy="${H / 2}" rx="330" ry="285" fill="url(#pool)"/>

  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none"
        stroke="${CREAM}" stroke-opacity="0.18" stroke-width="1"/>

  <rect x="${W / 2 - 23}" y="${top}" width="46" height="${RULE_H}" fill="${GOLD}"/>

  <text x="${W / 2}" y="${kickerY}" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="15" letter-spacing="4.5" fill="${GOLD}">${esc(kicker)}</text>

${titleMarkup}

  <rect x="${W / 2 - 54}" y="${dividerY}" width="108" height="3" fill="${GOLD}"/>

${bodyMarkup}

  <text x="${W / 2}" y="578" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="13" letter-spacing="0.8" fill="${MUTED}" opacity="0.85">${esc(SITE)}</text>

  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="#A67C2E"/>
</svg>`;

  fs.mkdirSync(path.dirname(out), { recursive: true });

  // Baseline, not progressive: see the header note.
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 84, chromaSubsampling: '4:4:4', progressive: false, optimiseCoding: true })
    .toFile(out);

  const { size } = fs.statSync(out);
  return Math.round(size / 1024);
}

async function buildProjectCard(project, index) {
  const kicker = 'PROJECT // ' + oneLine(project.category || 'Robotics').toUpperCase();
  const title = fitTitle(projectName(project), [
    [62, 66],
    [52, 56],
  ], TEXT_MAX_WIDTH, 2);
  const body = wrapSpec(project.monoSpec || '', 18, 30, 1, 3);

  const out = path.join(OUT_DIR, `project-${project.slug}.jpg`);
  const kb = await renderCard({
    out,
    kicker,
    title,
    body,
    photo: photoSource(project),
  });

  console.log(
    `Wrote ${path.relative(ROOT, out).split(path.sep).join('/')} ` +
      `(${String(index).padStart(2, '0')} ${title.lines.join(' ')}, ${W}x${H}, ${kb} KB)`
  );
  if (kb > 300) console.warn('  ! over 300 KB — unfurlers may skip it');
}

async function buildNoteCard(entry, index) {
  const kicker = 'FIELD NOTE // ' + oneLine(entry.category || 'Field Notes').toUpperCase();
  const title = fitTitle(entry.title || '', [
    [46, 52],
    [42, 48],
    [38, 43],
  ], TEXT_MAX_WIDTH, 4);
  const body = fitBody(entry.subtitle || entry.summary || '', 15, 26, 0.6, 3);

  const out = path.join(OUT_DIR, `note-${entry.slug}.jpg`);
  const kb = await renderCard({
    out,
    kicker,
    title,
    body,
    photo: notePhotoSource(entry),
  });

  console.log(
    `Wrote ${path.relative(ROOT, out).split(path.sep).join('/')} ` +
      `(${String(index).padStart(2, '0')} ${title.lines.slice(0, 2).join(' ')}, ${W}x${H}, ${kb} KB)`
  );
  if (kb > 300) console.warn('  ! over 300 KB — unfurlers may skip it');
}

(async () => {
  const projectsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/projects.json'), 'utf8'));
  const projects = (Array.isArray(projectsRaw) ? projectsRaw : projectsRaw.projects || []).filter(
    (project) => project && project.slug
  );

  const journalRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/journal.json'), 'utf8'));
  const entries = (journalRaw.entries || []).filter(
    (entry) => entry && entry.slug && entry.title && entry.status === 'published'
  );

  let n = 0;
  for (const project of projects) await buildProjectCard(project, ++n);

  let m = 0;
  for (const entry of entries) await buildNoteCard(entry, ++m);

  console.log(
    `Wrote ${n} project card${n === 1 ? '' : 's'} and ${m} field-note card${m === 1 ? '' : 's'}.`
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
