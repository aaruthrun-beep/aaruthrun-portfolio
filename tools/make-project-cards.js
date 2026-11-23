/**
 * AARUTHRUN PORTFOLIO — PROJECT SHARE CARDS
 *
 * One 1200x630 link-preview card per project, so a shared project link shows
 * the build — its photograph, its name and its one-line specification — rather
 * than the portrait card used for the site itself.
 *
 *   data/projects.json  ->  images/og/project-<slug>.jpg
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
 *   | photo|  ---               | photo |
 *   |      |  spec // spec      |       |
 *   |      |  site              |       |
 *   |      |                    |       |
 *   +-----------------------------------+
 *
 * The photograph bleeds the full width, so the wide view gains picture at the
 * sides and the square view keeps the same composition. Nothing important sits
 * outside the safe square — only photo and the gold footer, which are trim.
 *
 * The photo is the web-sized archive derivative when one exists (the originals
 * in images/projects run up to 16 MB, which unfurlers time out on). The card is
 * encoded as a baseline JPEG for the same reason as the portrait card:
 * WhatsApp's thumbnailer paints progressive JPEGs as a black rectangle.
 *
 * Run: node tools/make-project-cards.js
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
const SAFE_X = (W - SAFE) / 2;
const SAFE_PAD = 60;
const TEXT_MAX_WIDTH = SAFE - SAFE_PAD * 2;

const CREAM = '#F7F5EE';
const GOLD = '#D9AE63';
const MUTED = '#D5D9D3';

const SITE = 'aaruthrun-beep.github.io/aaruthrun-portfolio';
const RASTER = /\.(jpe?g|png|webp)$/i;

const NAME_SIZE = 62;
const NAME_LEADING = 66;
const NAME_SMALL = 52;
const NAME_SMALL_LEADING = 56;

const SPEC_SIZE = 18;
const SPEC_LEADING = 30;
const SPEC_TRACKING = 1;
const SPEC_MAX_LINES = 3;

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
function wrapName(text, size, maxWidth) {
  const charWidth = size * 0.53;
  const maxChars = Math.max(8, Math.floor(maxWidth / charWidth));
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
  return lines;
}

// The monospace specs are written as "segment // segment // segment", so wrap
// at the separators: a line never ends mid-spec and the "//" never opens one.
function wrapSpec(text) {
  const charWidth = SPEC_SIZE * 0.6 + SPEC_TRACKING;
  const maxChars = Math.floor(TEXT_MAX_WIDTH / charWidth);
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
  return lines.slice(0, SPEC_MAX_LINES);
}

// "NITE 369 — Six-Axis Robotic Arm" reads as "NITE 369" on the card; the rest
// of the title is already implied by the spec line underneath.
function projectName(project) {
  const title = oneLine(project.shortTitle || project.title);
  const split = oneLine(project.title).split(' — ')[0];
  return title || split;
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

function photoSource(project) {
  const archived = 'images/archive/' + project.slug + '.jpg';
  if (exists(archived)) return archived;
  if (RASTER.test(project.image || '') && exists(project.image)) return project.image;
  return null;
}

async function buildCard(project, index) {
  const slug = project.slug;
  const src = photoSource(project);

  const name = projectName(project);
  let nameSize = NAME_SIZE;
  let leading = NAME_LEADING;
  let nameLines = wrapName(name, nameSize, TEXT_MAX_WIDTH);
  if (nameLines.length > 2) {
    nameSize = NAME_SMALL;
    leading = NAME_SMALL_LEADING;
    nameLines = wrapName(name, nameSize, TEXT_MAX_WIDTH);
  }

  const specLines = wrapSpec(project.monoSpec || '');

  // The block is measured top-down and then centred vertically.
  const RULE_H = 4;
  const KICKER_OFFSET = 40; // rule top -> kicker baseline
  const NAME_OFFSET = 118; // rule top -> first name baseline
  const RULE_GAP = 34; // last name baseline -> rule top
  const SPEC_GAP = 48; // rule top -> first spec baseline
  const TAIL = 12; // descender room under the last spec baseline

  const blockHeight =
    NAME_OFFSET +
    (nameLines.length - 1) * leading +
    RULE_GAP +
    SPEC_GAP +
    (specLines.length - 1) * SPEC_LEADING +
    TAIL;
  const top = Math.round((H - blockHeight) / 2);

  const ruleY = top;
  const kickerY = top + KICKER_OFFSET;
  const nameBase = top + NAME_OFFSET;
  const dividerY = nameBase + (nameLines.length - 1) * leading + RULE_GAP;
  const specStart = dividerY + SPEC_GAP;

  const kicker = 'PROJECT // ' + oneLine(project.category || 'Robotics').toUpperCase();

  let photoMarkup = '';
  if (src) {
    // Full-bleed: covers the wide view, and the centre square still shows the
    // middle of the photograph rather than an empty margin.
    const photo = await sharp(path.join(ROOT, src))
      .rotate()
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 86 })
      .toBuffer();

    photoMarkup = `
  <image xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"
         x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  const nameMarkup = nameLines
    .map(
      (line, i) =>
        `  <text x="${W / 2}" y="${nameBase + i * leading}" text-anchor="middle" font-family="DM Serif Display, Georgia, 'Times New Roman', serif"
        font-size="${nameSize}" letter-spacing="-1" fill="${CREAM}">${esc(line)}</text>`
    )
    .join('\n');

  const specMarkup = specLines
    .map(
      (line, i) =>
        `  <text x="${W / 2}" y="${specStart + i * SPEC_LEADING}" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="${SPEC_SIZE}" letter-spacing="${SPEC_TRACKING}" fill="${MUTED}">${esc(line)}</text>`
    )
    .join('\n');

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

  <rect width="${W}" height="${H}" fill="#151917"/>
${photoMarkup}
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <rect width="${W}" height="${H}" fill="url(#edges)"/>

  <!-- A soft dark pool under the copy, so the spec stays legible over a
       busy render without a visible plate edge. -->
  <ellipse cx="${W / 2}" cy="${H / 2}" rx="330" ry="285" fill="url(#pool)"/>

  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none"
        stroke="${CREAM}" stroke-opacity="0.18" stroke-width="1"/>

  <rect x="${W / 2 - 23}" y="${ruleY}" width="46" height="${RULE_H}" fill="${GOLD}"/>

  <text x="${W / 2}" y="${kickerY}" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="15" letter-spacing="4.5" fill="${GOLD}">${esc(kicker)}</text>

${nameMarkup}

  <rect x="${W / 2 - 54}" y="${dividerY}" width="108" height="3" fill="${GOLD}"/>

${specMarkup}

  <text x="${W / 2}" y="578" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="13" letter-spacing="0.8" fill="${MUTED}" opacity="0.85">${esc(SITE)}</text>

  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="#A67C2E"/>
</svg>`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `project-${slug}.jpg`);

  // Baseline, not progressive: see the header note.
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 84, chromaSubsampling: '4:4:4', progressive: false, optimiseCoding: true })
    .toFile(out);

  const { size } = fs.statSync(out);
  const kb = Math.round(size / 1024);
  console.log(
    `Wrote ${path.relative(ROOT, out).split(path.sep).join('/')} ` +
      `(${String(index).padStart(2, '0')} ${name}, ${W}x${H}, ${kb} KB)`
  );
  if (size > 300 * 1024) console.warn('  ! over 300 KB — unfurlers may skip it');
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/projects.json'), 'utf8'));
  const projects = Array.isArray(raw) ? raw : raw.projects || [];
  const withSlugs = projects.filter((project) => project && project.slug);

  let n = 0;
  for (const project of withSlugs) {
    await buildCard(project, ++n);
  }
  console.log(`Wrote ${n} project share card${n === 1 ? '' : 's'}.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
