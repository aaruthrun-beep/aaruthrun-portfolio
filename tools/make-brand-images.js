/**
 * AARUTHRUN PORTFOLIO — BRAND IMAGES
 *
 * Builds the two identity images from the portrait in images/aaruthrun.jpeg:
 *
 *   images/logo/aaruthrun-logo.png   square crop of the face, used in the header
 *   images/og-image.jpg              1200x630 card used for link previews
 *                                    (WhatsApp, Slack, X, iMessage…)
 *
 * The preview card has to be a JPEG: WhatsApp and several other unfurlers do
 * not decode WebP, and they want a wide 1.91:1 image under a few hundred KB.
 *
 * Run: node tools/make-brand-images.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PORTRAIT = path.join(ROOT, 'images/aaruthrun.jpeg');
const LOGO_OUT = path.join(ROOT, 'images/logo/aaruthrun-logo.png');
const OG_OUT = path.join(ROOT, 'images/og-image.jpg');

const NAME = 'Aaruthrun S';
const ROLE = 'ROBOTICS AND AUTOMATION ENGINEER';
const LINE = 'SIX-AXIS ARMS \u00b7 BLDC ACTUATORS \u00b7 AUTONOMOUS ROVERS';
const SITE = 'aaruthrun-beep.github.io/aaruthrun-portfolio';

const INK = '#202524';
const CREAM = '#F5F3EB';
const GOLD = '#A67C2E';
const MUTED = '#6C736E';

/* -------------------------------------------------------------------------- */
/* Header logo                                                                */
/* -------------------------------------------------------------------------- */

async function buildLogo() {
  fs.mkdirSync(path.dirname(LOGO_OUT), { recursive: true });

  // The portrait is 1088x1445 with the head centred on x≈530. A 720px square
  // from (170, 145) leaves a little headroom above the hair while stopping at
  // the shoulders.
  await sharp(PORTRAIT)
    .extract({ left: 170, top: 145, width: 720, height: 720 })
    .resize(160, 160, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(LOGO_OUT);

  console.log('Wrote ' + path.relative(ROOT, LOGO_OUT) + ' (160x160)');
}

/* -------------------------------------------------------------------------- */
/* Link-preview card                                                          */
/* -------------------------------------------------------------------------- */

async function buildCard() {
  const W = 1200;
  const H = 630;

  // Photo panel, inset from the right edge like a framed print.
  const PW = 350;
  const PH = 510;
  const PX = W - 72 - PW;
  const PY = (H - PH) / 2;

  const photo = await sharp(PORTRAIT)
    .resize(PW * 2, PH * 2, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 88 })
    .toBuffer();

  const dots = [];
  for (let x = 40; x < W; x += 18) {
    for (let y = 40; y < H; y += 18) dots.push(`<circle cx="${x}" cy="${y}" r="1"/>`);
  }

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

  <image xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"
         x="${PX}" y="${PY}" width="${PW}" height="${PH}"
         preserveAspectRatio="xMidYMin slice" clip-path="url(#photoClip)"/>
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="4" fill="none" stroke="${INK}" stroke-opacity="0.85" stroke-width="2"/>

  <rect x="72" y="150" width="46" height="4" fill="${GOLD}"/>

  <text x="72" y="196" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="15" letter-spacing="4.5" fill="${GOLD}">ENGINEERING ARCHIVE</text>

  <text x="70" y="300" font-family="DM Serif Display, Georgia, 'Times New Roman', serif"
        font-size="86" letter-spacing="-1" fill="${INK}">${NAME}</text>

  <rect x="72" y="336" width="108" height="3" fill="${GOLD}"/>

  <text x="72" y="392" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="22" letter-spacing="1.6" fill="${INK}">${ROLE}</text>

  <text x="72" y="442" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="14" letter-spacing="1.2" fill="${MUTED}">${LINE}</text>

  <text x="72" y="562" font-family="JetBrains Mono, DejaVu Sans Mono, Consolas, monospace"
        font-size="14" letter-spacing="0.8" fill="${MUTED}">${SITE}</text>

  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${GOLD}"/>
</svg>`;

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 84, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(OG_OUT);

  const { size } = fs.statSync(OG_OUT);
  console.log('Wrote ' + path.relative(ROOT, OG_OUT) + ' (' + W + 'x' + H + ', ' + Math.round(size / 1024) + ' KB)');
}

(async () => {
  await buildLogo();
  await buildCard();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
