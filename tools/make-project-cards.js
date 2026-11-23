/**
 * AARUTHRUN PORTFOLIO — PROJECT SHARE CARDS
 *
 * One 1200x630 link-preview card per project, so a shared project link shows
 * the build — its photograph, its name and its one-line specification — rather
 * than the portrait card used for the site itself.
 *
 *   data/projects.json  ->  images/og/project-<slug>.jpg
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

const INK = '#202524';
const CREAM = '#F5F3EB';
const GOLD = '#A67C2E';
const MUTED = '#6C736E';

const SITE = 'aaruthrun-beep.github.io/aaruthrun-portfolio';
const RASTER = /\.(jpe?g|png|webp)$/i;

const NAME_SIZE = 62;
const NAME_LEADING = 66;
const NAME_MAX_WIDTH = 512;

const SPEC_SIZE = 18;
const SPEC_LEADING = 30;
const SPEC_TRACKING = 1;
const SPEC_MAX_WIDTH = 516;
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
function wrapName(text, size) {
  const charWidth = size * 0.53;
  const maxChars = Math.max(10, Math.floor(NAME_MAX_WIDTH / charWidth));
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
  const maxChars = Math.floor(SPEC_MAX_WIDTH / charWidth);
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
  let nameLines = wrapName(name, NAME_SIZE);
  let nameSize = NAME_SIZE;
  let leading = NAME_LEADING;
  if (nameLines.length > 2) {
    nameSize = 52;
    leading = 56;
    nameLines = wrapName(name, nameSize);
  }

  const specLines = wrapSpec(project.monoSpec || '');

  const PW = 504;
  const PH = 420;
  const PX = W - 72 - PW;
  const PY = Math.round((H - PH) / 2);

  const kicker = 'PROJECT // ' + oneLine(project.category || 'Robotics').toUpperCase();
  const kickerY = 176;

  const nameBase = kickerY + 96;
  const lastBaseline = nameBase + (nameLines.length - 1) * leading;
  const ruleY = lastBaseline + 34;
  const specStart = ruleY + 52;

  const dots = [];
  for (let x = 40; x < W; x += 18) {
    for (let y = 40; y < H; y += 18) dots.push(`<circle cx="${x}" cy="${y}" r="1"/>`);
  }

  let photoMarkup = '';
  if (src) {
    const photo = await sharp(path.join(ROOT, src))
      .rotate()
      .resize(PW * 2, PH * 2, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 88 })
      .toBuffer();

    photoMarkup = `
  <image xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"
         x="${PX}" y="${PY}" width="${PW}" height="${PH}"
         preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="4" fill="none" stroke="${INK}" stroke-opacity="0.85" stroke-width="2"/>`;
  }

  const nameMarkup = nameLines
    .map(
      (line, i) =>
        `  <text x="70" y="${nameBase + i * leading}" font-family="DM Serif Display, Georgia, 'Times New Roman', serif"
        font-size="${nameSize}" letter-spacing="-1" fill="${INK}">${esc(line)}</text>`
    )
    .join('\n');

  const specMarkup = specLines
    .map(
      (line, i) =>
        `  <text x="72" y="${specStart + i * SPEC_LEADING}" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="${SPEC_SIZE}" letter-spacing="${SPEC_TRACKING}" fill="${MUTED}">${esc(line)}</text>`
    )
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="photoClip"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="4"/></clipPath>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FBFAF4"/>
      <stop offset="0.6" stop-color="${CREAM}"/>
      <stop offset="1" stop-color="#EAE8E0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  <g fill="${INK}" opacity="0.13">${dots.join('')}</g>
${photoMarkup}

  <rect x="72" y="132" width="46" height="4" fill="${GOLD}"/>

  <text x="72" y="${kickerY}" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="15" letter-spacing="4.5" fill="${GOLD}">${esc(kicker)}</text>

${nameMarkup}

  <rect x="72" y="${ruleY}" width="108" height="3" fill="${GOLD}"/>

${specMarkup}

  <text x="72" y="566" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="14" letter-spacing="0.8" fill="${MUTED}">${esc(SITE)}</text>

  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${GOLD}"/>
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
