#!/usr/bin/env node
/**
 * GALLERY BUILD
 *
 *   node tools/build-gallery.mjs           build once
 *   node tools/build-gallery.mjs --watch   rebuild when a photo is added
 *
 * Reads every folder in images/projects/<slug>/ as a project, keeps the
 * metadata from data/projects.json, reads each photo's real pixel size and
 * writes data/gallery.json - the manifest plus the layout the page renders.
 *
 * Placements are reused from the previous build, so dropping a photo into a
 * folder only grows that project's circle instead of reshuffling the map.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { FRAME, frameOf, LAYOUT_VERSION, layoutGallery, verifyLayout } from './gallery-layout.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_DIR = path.join(ROOT, 'images', 'projects');
const DATA_DIR = path.join(ROOT, 'data');
const PROJECTS_JSON = path.join(DATA_DIR, 'projects.json');
const OUTPUT = path.join(DATA_DIR, 'gallery.json');

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

// A project's video links live in a plain notepad file next to its photos.
const VIDEO_FILES = ['videos.txt', 'video.txt'];
const args = new Set(process.argv.slice(2));
const watchMode = args.has('--watch') || args.has('-w');

// exifr is optional: without it the build still works, captions just fall
// back to the filename and the sidecar file.
const exifr = await import('exifr').then((m) => m.default || m).catch(() => null);

/* ------------------------------------------------------------------ */
/* Captions                                                            */
/* ------------------------------------------------------------------ */

// 20260315 | 2026-03-15 | 2026_03_15 | 2026.03.15, also inside IMG_/PXL_ names
const DATE_RE = /(20\d{2}|19\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?!\d)/;

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// First match wins: sidecar override, filename convention, EXIF, blank.
// The file's mtime is deliberately ignored - it is the copy date, not the
// date the photo was taken.
async function resolveMeta(file, fullPath, captions = {}) {
  const [head, ...rest] = path.parse(file).name.split('__');
  const sidecar = captions[file] || {};

  let date = sidecar.date || '';
  if (!date) {
    const match = head.match(DATE_RE);
    if (match) date = `${match[1]}-${match[2]}-${match[3]}`;
  }

  if (!date && exifr) {
    try {
      const exif = await exifr.parse(fullPath, ['DateTimeOriginal', 'CreateDate']);
      const shot = exif && (exif.DateTimeOriginal || exif.CreateDate);
      if (shot) date = iso(new Date(shot));
    } catch {
      // unreadable metadata is fine: the print just has no date
    }
  }

  const text = sidecar.text != null
    ? String(sidecar.text)
    : rest.join(' ').replace(/[-_]+/g, ' ').trim();

  return { date, text };
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

// Read the real gallery numbers out of config/app.config.js instead of
// keeping a second copy that can drift.
function loadConfig() {
  const fallback = {
    pad: 6,
    density: 0.75,
    candidates: 60,
    jitter: 0.1,
    maxRot: 6,
    compact: 40,
    projectGap: 240,
    clusterMargin: 900,
  };
  try {
    const source = fs.readFileSync(path.join(ROOT, 'config', 'app.config.js'), 'utf8');
    const sandbox = {
      window: { location: { origin: 'http://localhost', pathname: '/' } },
      document: {},
      localStorage: { getItem: () => null },
    };
    vm.runInNewContext(
      source + '\n;globalThis.__galleryConfig = AppConfig.getGallery();',
      sandbox,
      { timeout: 1000 }
    );
    return { ...fallback, ...sandbox.__galleryConfig };
  } catch (err) {
    console.warn(`[gallery] using default layout numbers (${err.message})`);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Image dimensions                                                    */
/* ------------------------------------------------------------------ */

function parseImageSize(buf) {
  if (!buf || buf.length < 26) return null;

  // PNG
  if (buf.length > 24 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf.toString('ascii', 12, 16) === 'IHDR') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }

  // GIF
  if (buf.toString('ascii', 0, 3) === 'GIF') {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }

  // WebP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8 ') {
      const start = 26;
      if (buf[start] === 0x9d && buf[start + 1] === 0x01 && buf[start + 2] === 0x2a) {
        return {
          w: buf.readUInt16LE(start + 3) & 0x3fff,
          h: buf.readUInt16LE(start + 5) & 0x3fff,
        };
      }
    }
    if (kind === 'VP8L' && buf[20] === 0x2f) {
      const b = buf.subarray(21);
      const w = 1 + (((b[1] & 0x3f) << 8) | b[0]);
      const h = 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6));
      return { w, h };
    }
    if (kind === 'VP8X') {
      return {
        w: 1 + buf.readUIntLE(24, 3),
        h: 1 + buf.readUIntLE(27, 3),
      };
    }
  }

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break;
      const length = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + length;
    }
  }

  return null;
}

async function readImageSize(file) {
  try {
    const handle = await fsp.open(file, 'r');
    try {
      const head = Buffer.alloc(128 * 1024);
      const { bytesRead } = await handle.read(head, 0, head.length, 0);
      let size = parseImageSize(head.subarray(0, bytesRead));

      if (!size) {
        const stat = await handle.stat();
        if (stat.size > bytesRead) {
          const full = Buffer.alloc(stat.size);
          const read = await handle.read(full, 0, stat.size, 0);
          size = parseImageSize(full.subarray(0, read.bytesRead));
        }
      }

      return size && size.w > 0 && size.h > 0 ? size : null;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

async function readProjectMeta() {
  try {
    const text = (await fsp.readFile(PROJECTS_JSON, 'utf8')).replace(/^\uFEFF/, '');
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.projects || [];
  } catch (err) {
    console.warn(`[gallery] data/projects.json not read (${err.message})`);
    return [];
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function listFolders(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
  } catch {
    return [];
  }
}

const YOUTUBE_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?[^#\s]*?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/;

function youtubeId(text) {
  const value = String(text || '').trim();
  const match = value.match(YOUTUBE_ID);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  return '';
}

// images/projects/<slug>/videos.txt — one video per line, either
//   https://youtu.be/VIDEOID
//   Title of the video | https://youtu.be/VIDEOID
// Blank lines and lines starting with # are ignored, so the file can carry
// its own instructions at the top.
async function readVideos(folder) {
  for (const name of VIDEO_FILES) {
    let text;
    try {
      text = await fsp.readFile(path.join(folder, name), 'utf8');
    } catch {
      continue;
    }

    const videos = [];
    const seen = new Set();

    for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;

      const bar = line.indexOf('|');
      const title = bar > 0 ? line.slice(0, bar).trim() : '';
      const id = youtubeId(bar > 0 ? line.slice(bar + 1) : line) || youtubeId(line);

      if (!id || seen.has(id)) continue;
      seen.add(id);
      videos.push({ id, title });
    }

    return videos;
  }

  return [];
}

async function listImages(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && IMAGE_RE.test(e.name) && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// Photos keep their own resolution, but a 590px-wide phone screenshot would
// read as a speck next to a 4096px photo. Lift small files to a usable
// footprint; never enlarge by more than maxPhotoUpscale and never shrink.
function displaySize(size, cfg) {
  const floor = Number(cfg.minPhotoEdge) || 0;
  const cap = Number(cfg.maxPhotoUpscale) || 1;
  const long = Math.max(size.w, size.h);

  if (!floor || long >= floor) return { w: size.w, h: size.h, factor: 1 };

  const factor = Math.min(floor / long, cap);
  if (factor <= 1.001) return { w: size.w, h: size.h, factor: 1 };

  return {
    w: Math.round(size.w * factor),
    h: Math.round(size.h * factor),
    factor,
  };
}

// tools/build-responsive.mjs writes images/derived/... variants. Record the
// ones that exist so the page can offer them, rather than making the browser
// request candidates that were never built.
const DERIVED_WIDTHS = [400, 800, 1600];

function srcsetFor(src) {
  if (!/\.(jpe?g|png|webp)$/i.test(src)) return '';
  const base = src
    .replace(/^images\//, 'images/derived/')
    .replace(/\.(jpe?g|png|webp)$/i, '');
  const candidates = [];
  for (const width of DERIVED_WIDTHS) {
    const candidate = `${base}-${width}.jpg`;
    if (!fs.existsSync(path.join(ROOT, candidate))) continue;
    candidates.push(`${encodeURI(candidate)} ${width}w`);
  }
  return candidates.join(', ');
}

function titleFromSlug(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function collectProjects(meta, cfg) {
  const metaBySlug = new Map();
  for (const project of meta) {
    if (project && typeof project.slug === 'string') metaBySlug.set(project.slug, project);
  }

  const folders = await listFolders(PROJECTS_DIR);
  const slugs = [];
  const seen = new Set();

  for (const project of meta) {
    if (!project || !project.slug || seen.has(project.slug)) continue;
    seen.add(project.slug);
    slugs.push(project.slug);
  }
  for (const folder of folders.sort()) {
    if (seen.has(folder)) continue;
    seen.add(folder);
    slugs.push(folder);
  }

  const projects = [];
  let enlarged = 0;
  let dated = 0;
  let captioned = 0;

  for (const slug of slugs) {
    const folder = path.join(PROJECTS_DIR, slug);
    const sidecar = await readJson(path.join(folder, 'project.json'));
    const captions = (sidecar && sidecar.captions) || {};

    // A folder with no entry in data/projects.json is not a project page:
    // it is a photo set that belongs to a page which already exists (Avani
    // AgroTech lives on startup.html). Its project.json can name it and point
    // its prints at that page.
    const site = (sidecar && sidecar.site) || {};

    const info = metaBySlug.get(slug) || {
      slug,
      id: 0,
      title: site.title || titleFromSlug(slug),
      shortTitle: site.shortTitle || site.title || titleFromSlug(slug),
      start: site.start || null,
      end: site.end || null,
      href: site.href || '',
    };

    const files = await listImages(folder);

    // An explicit `images` list in data/projects.json sets the running order,
    // because the project page uses the same list; files dropped into the
    // folder later are appended in filename order.
    const explicit = [];
    for (const src of info.images || []) {
      if (typeof src !== 'string' || !IMAGE_RE.test(src)) continue;
      const normalized = src.replace(/\\/g, '/');
      if (explicit.includes(normalized)) continue;
      if (fs.existsSync(path.join(ROOT, normalized))) explicit.push(normalized);
    }

    const sources = explicit.concat(
      files
        .map((name) => `images/projects/${slug}/${name}`)
        .filter((src) => !explicit.includes(src))
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    );

    const images = [];
    for (const src of sources) {
      const natural = await readImageSize(path.join(ROOT, src));
      if (!natural) {
        console.warn(`[gallery] skipped unreadable image: ${src}`);
        continue;
      }
      const shown = displaySize(natural, cfg);
      const frame = frameOf(shown.w, shown.h, cfg.frame || FRAME);
      const caption = await resolveMeta(path.basename(src), path.join(ROOT, src), captions);

      if (shown.factor > 1.001) enlarged++;
      if (caption.date) dated++;
      if (caption.text) captioned++;

      images.push({
        src,
        w: frame.W,
        h: frame.H,
        pw: shown.w,
        ph: shown.h,
        side: frame.side,
        bottom: frame.bottom,
        nw: natural.w,
        nh: natural.h,
        srcset: srcsetFor(src),
        text: caption.text,
        date: caption.date,
      });
    }

    // Videos are prints too, but the picture is always exactly 16:9 - the
    // YouTube ratio - and the bezel around it is even on all four sides, so
    // the player fills its screen with no letterboxing.
    const videoEdge = Math.round(Number(cfg.videoEdge) || Number(cfg.minPhotoEdge) || 4000);
    const videoW = videoEdge;
    const videoH = Math.round(videoEdge * (9 / 16));
    const frameCfg = cfg.frame || FRAME;
    const videoSide = Math.round(Math.max(frameCfg.minSide, videoW * frameCfg.sideRatio));
    const videoFrame = {
      side: videoSide,
      top: videoSide,
      bottom: videoSide,
      W: videoW + videoSide * 2,
      H: videoH + videoSide * 2,
    };

    for (const video of await readVideos(folder)) {
      images.push({
        kind: 'video',
        videoId: video.id,
        src: `video:${video.id}`,
        w: videoFrame.W,
        h: videoFrame.H,
        pw: videoW,
        ph: videoH,
        side: videoFrame.side,
        bottom: videoFrame.bottom,
        nw: videoW,
        nh: videoH,
        srcset: '',
        text: video.title,
        date: '',
      });
    }

    if (!explicit.length) {
      images.sort((a, b) => a.src.localeCompare(b.src, 'en', { numeric: true }));
    }

    if (!images.length) continue;
    projects.push({ ...info, images });
  }

  collectProjects.enlarged = enlarged;
  collectProjects.dated = dated;
  collectProjects.captioned = captioned;
  return projects;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

async function build() {
  const started = Date.now();
  const cfg = loadConfig();
  const meta = await readProjectMeta();
  const previous = await readJson(OUTPUT);
  const projects = await collectProjects(meta, cfg);

  const layout = layoutGallery(projects, previous, cfg);
  const model = {
    version: 1,
    layoutVersion: LAYOUT_VERSION,
    generatedAt: new Date().toISOString(),
    ...layout,
  };

  await fsp.mkdir(DATA_DIR, { recursive: true });

  // generatedAt changes on every run; keep the previous value when nothing
  // else moved so a no-op build does not dirty the working tree (CI runs
  // this and then checks that generated files are committed).
  const strip = (value) => value && JSON.stringify({ ...value, generatedAt: undefined });
  if (previous && strip(previous) === strip(model)) {
    model.generatedAt = previous.generatedAt;
  } else {
    const tmp = OUTPUT + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(model, null, 2) + '\n');
    await fsp.rename(tmp, OUTPUT);
  }

  const total = model.projects.reduce((sum, p) => sum + p.images.length, 0);
  const videos = model.projects.reduce(
    (sum, p) => sum + p.images.filter((img) => img.kind === 'video').length,
    0
  );
  const photos = total - videos;
  const ms = Date.now() - started;
  const enlarged = collectProjects.enlarged || 0;
  const dated = collectProjects.dated || 0;
  const captioned = collectProjects.captioned || 0;

  console.log(
    `[gallery] ${model.projects.length} circles · ${photos} photos` +
    (videos ? ` · ${videos} videos` : '') +
    (enlarged ? ` (${enlarged} lifted to ${cfg.minPhotoEdge}px)` : '') +
    ` · ${dated} dated · ${captioned} captioned` +
    ` · ${model.canvas.width}×${model.canvas.height} · ${ms}ms → data/gallery.json`
  );

  for (const project of model.projects) {
    const count = project.images.filter((img) => img.kind !== 'video').length;
    const clips = project.images.length - count;
    console.log(
      `          ${project.slug.padEnd(24)} ${String(count).padStart(2)} photos` +
      (clips ? ` + ${clips} video` : '') +
      `  r=${project.radius}`
    );
  }

  const problems = verifyLayout(model, cfg);
  if (problems.length) {
    console.error(`[gallery] ${problems.length} layout problem(s):`);
    for (const problem of problems.slice(0, 8)) console.error(`          ${problem}`);
  } else {
    console.log('[gallery] check: no photo overlaps, no circle overlaps');
  }

  return model;
}

/* ------------------------------------------------------------------ */
/* Watch                                                               */
/* ------------------------------------------------------------------ */

function startWatching() {
  let timer = null;
  let running = false;
  let queued = false;

  const run = async () => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      await build();
    } catch (err) {
      console.error('[gallery] build failed:', err);
    }
    running = false;
    if (queued) {
      queued = false;
      schedule();
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 220);
  };

  const targets = [PROJECTS_DIR, path.join(DATA_DIR, 'projects.json')];
  let watching = 0;

  for (const target of targets) {
    try {
      fs.watch(target, { recursive: true }, schedule);
      watching++;
    } catch (err) {
      // Linux does not support recursive watching; watch each project folder.
      try {
        const folders = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => path.join(PROJECTS_DIR, e.name));
        for (const folder of folders) fs.watch(folder, schedule);
        watching += folders.length;
      } catch {
        console.warn(`[gallery] could not watch ${target}: ${err.message}`);
      }
    }
  }

  console.log(`[gallery] watching ${watching} location(s) - drop a photo in a folder to rebuild`);
}

build()
  .then(() => {
    if (watchMode) startWatching();
  })
  .catch((err) => {
    console.error('[gallery] ' + (err && err.stack ? err.stack : err));
    process.exitCode = 1;
  });
