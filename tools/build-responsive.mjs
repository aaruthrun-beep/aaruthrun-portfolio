#!/usr/bin/env node
/**
 * RESPONSIVE IMAGE DERIVATIVES
 *
 *   node tools/build-responsive.mjs          write missing derivatives
 *   node tools/build-responsive.mjs --check  fail if any are missing/stale
 *
 * Phone originals in images/projects are 4000px wide and up to 16 MB. The
 * gallery prints and project cards never need that much: this writes two
 * JPEG derivatives per source and the pages offer them through srcset, so a
 * phone downloads ~120 KB instead of 6 MB.
 *
 *   images/projects/<slug>/<name>.jpg
 *     -> images/derived/projects/<slug>/<name>-800.jpg
 *     -> images/derived/projects/<slug>/<name>-1600.jpg
 *
 * The convention is mirrored by ContentBlocks.srcset() and
 * GalleryManager, so keep the paths in sync if this changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'images');
const OUTPUT_DIR = path.join(SOURCE_DIR, 'derived');
const WIDTHS = [800, 1600];
const RASTER = /\.(jpe?g|png|webp)$/i;
const SKIP_DIRS = new Set(['derived']);

const checkOnly = process.argv.includes('--check');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (RASTER.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function outputFor(source, width) {
  const rel = path.relative(SOURCE_DIR, source);
  const parsed = path.parse(rel);
  return path.join(OUTPUT_DIR, parsed.dir, `${parsed.name}-${width}.jpg`);
}

async function main() {
  const sources = walk(path.join(SOURCE_DIR, 'projects')).concat(
    walk(path.join(SOURCE_DIR, 'selected')),
    walk(path.join(SOURCE_DIR, 'home'))
  );

  let written = 0;
  let skipped = 0;
  let stale = 0;
  let bytes = 0;

  for (const source of sources) {
    const stat = fs.statSync(source);
    for (const width of WIDTHS) {
      const target = outputFor(source, width);
      const exists = fs.existsSync(target);
      const fresh = exists && fs.statSync(target).mtimeMs >= stat.mtimeMs;
      if (fresh) { skipped++; continue; }
      stale++;
      if (checkOnly) continue;

      fs.mkdirSync(path.dirname(target), { recursive: true });
      const info = await sharp(source, { failOn: 'none', limitInputPixels: false })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 76, mozjpeg: true })
        .toFile(target);
      written++;
      bytes += info.size;
      console.log(`[responsive] ${path.relative(ROOT, target)} ${Math.round(info.size / 1024)} KB`);
    }
  }

  if (checkOnly) {
    if (stale) {
      console.error(`[responsive] ${stale} derivative(s) missing or older than their source.`);
      console.error('[responsive] run `npm run responsive` to regenerate.');
      process.exitCode = 1;
      return;
    }
    console.log(`[responsive] ${skipped} derivative(s) up to date`);
    return;
  }

  console.log(
    `[responsive] ${written} written · ${skipped} up to date · ` +
    `${(bytes / (1024 * 1024)).toFixed(1)} MB added · widths ${WIDTHS.join(', ')}`
  );
}

main().catch((error) => {
  console.error('[responsive] failed:', error.message);
  process.exitCode = 1;
});
