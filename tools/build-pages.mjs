#!/usr/bin/env node
/**
 * PRERENDERED PAGES — one static page per project and per published field note
 *
 *   node tools/build-pages.mjs
 *   node tools/build-pages.mjs --check
 *   node tools/build-pages.mjs --base-url=https://example.com/portfolio
 *
 * Link previews (LinkedIn, Slack, WhatsApp, Google) are built from the HTML the
 * crawler receives. project.html and journal-entry.html rewrite their <head> in
 * the browser, which those crawlers never run — so every pasted link showed the
 * same generic title.
 *
 * This bakes the metadata into real pages:
 *
 *   data/projects.json  ->  project-<slug>.html
 *   data/journal.json   ->  journal-<slug>.html
 *
 * The templates stay the source of truth for styles and scripts. Only the head
 * block between the build-pages markers, the body's data-page/data-slug
 * attributes and a <noscript> summary are generated. The page then boots the
 * normal renderer, which reads the slug from data-slug instead of ?slug=.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROJECT_TEMPLATE = path.join(ROOT, 'project.html');
const ENTRY_TEMPLATE = path.join(ROOT, 'journal-entry.html');

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const baseArg = [...args].find((a) => a.startsWith('--base-url='));

const FALLBACK_SITE_URL = 'https://aaruthrun-beep.github.io/aaruthrun-portfolio';
const FALLBACK_IMAGE = 'images/og-image.webp';
const RASTER = /\.(jpe?g|png|webp|gif|avif)$/i;
const GENERATED_RE = /^(project|journal)-[A-Za-z0-9._-]+\.html$/;
const MARKER = 'tools/build-pages.mjs';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

// Read the deployed origin out of config/app.config.js instead of keeping a
// second copy that can drift. --base-url wins for preview deploys and forks.
function loadSiteUrl() {
  try {
    const source = fs.readFileSync(path.join(ROOT, 'config', 'app.config.js'), 'utf8');
    const sandbox = {
      window: { location: { origin: 'http://localhost', pathname: '/' } },
      document: {},
      localStorage: { getItem: () => null },
    };
    vm.runInNewContext(
      source + '\n;globalThis.__site = AppConfig.getSite();',
      sandbox,
      { timeout: 1000 }
    );
    return (sandbox.__site && sandbox.__site.url) || FALLBACK_SITE_URL;
  } catch (error) {
    console.warn(`[pages] using ${FALLBACK_SITE_URL} (${error.message})`);
    return FALLBACK_SITE_URL;
  }
}

const BASE = (baseArg ? baseArg.slice('--base-url='.length) : loadSiteUrl()).replace(/\/+$/, '');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const exists = (rel) => Boolean(rel) && fs.existsSync(path.join(ROOT, rel));

const esc = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const oneLine = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const clip = (value, limit = 300) => {
  const text = oneLine(value);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return (space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.]$/, '') + '…';
};

// schema.org wants a full date; the data files carry YYYY-MM at the coarsest.
const isoDay = (value) => {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return text + '-01';
  return '';
};

const absolute = (rel) => BASE + '/' + String(rel).replace(/^\.?\//, '');

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

// The archive derivatives are ~50–140 KB; the originals in images/projects are
// up to 16 MB, which unfurlers time out on or refuse outright.
function projectImage(project) {
  const archived = 'images/archive/' + project.slug + '.jpg';
  if (exists(archived)) return archived;
  if (RASTER.test(project.image || '') && exists(project.image)) return project.image;
  return FALLBACK_IMAGE;
}

// Several journal covers are SVG, which social crawlers do not render. Fall back
// to the project's archive photograph, then to the site image.
function noteImage(entry, project) {
  if (RASTER.test(entry.cover || '') && exists(entry.cover)) return entry.cover;
  if (project) return projectImage(project);
  return FALLBACK_IMAGE;
}

/* ------------------------------------------------------------------ */
/* Head metadata                                                       */
/* ------------------------------------------------------------------ */

function jsonLdScript(payload) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `  <script type="application/ld+json">${json}</script>`;
}

function metaBlock(page) {
  const lines = [
    `  <meta name="generator" content="${MARKER}">`,
    `  <title>${esc(page.title)}</title>`,
    `  <meta name="description" content="${esc(page.description)}">`,
    `  <link rel="canonical" href="${esc(page.url)}">`,
    '',
    `  <meta property="og:title" content="${esc(page.ogTitle)}">`,
    `  <meta property="og:description" content="${esc(page.description)}">`,
    `  <meta property="og:type" content="${page.type}">`,
    `  <meta property="og:url" content="${esc(page.url)}">`,
    `  <meta property="og:image" content="${esc(page.image)}">`,
    `  <meta property="og:image:alt" content="${esc(page.imageAlt)}">`,
    '  <meta property="og:site_name" content="Aaruthrun">',
    '  <meta property="og:locale" content="en_IN">',
  ];

  if (page.published) {
    lines.push(`  <meta property="article:published_time" content="${esc(page.published)}">`);
    lines.push('  <meta property="article:author" content="Aaruthrun">');
  }

  lines.push('  <meta name="twitter:card" content="summary_large_image">');
  lines.push(`  <meta name="twitter:title" content="${esc(page.ogTitle)}">`);
  lines.push(`  <meta name="twitter:description" content="${esc(page.description)}">`);
  lines.push(`  <meta name="twitter:image" content="${esc(page.image)}">`);
  lines.push(jsonLdScript(page.jsonLd));

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function projectPage(project, projects) {
  const slug = project.slug;
  if (!slug) return null;

  const file = 'project-' + slug + '.html';
  const url = absolute(file);
  const image = absolute(projectImage(project));
  const description = clip(project.summary, 300);
  const published = isoDay(project.start);
  const modified = isoDay(project.end) || published;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: oneLine(project.title),
    description,
    image,
    url,
    keywords: (project.tags || []).join(', '),
    author: { '@type': 'Person', name: 'Aaruthrun', url: BASE },
    isPartOf: { '@type': 'CollectionPage', name: 'Engineering project archive', url: BASE + '/projects.html' },
  };
  if (published) jsonLd.datePublished = published;
  if (modified) jsonLd.dateModified = modified;

  return {
    kind: 'project',
    slug,
    file,
    title: `${oneLine(project.title)} — Aaruthrun`,
    ogTitle: oneLine(project.title),
    description,
    url,
    image,
    imageAlt: oneLine(project.shortTitle || project.title),
    type: 'article',
    published: published || '',
    jsonLd,
    noscript: [
      '    <noscript>',
      '      <div class="container">',
      `        <p class="mono text-muted">PROJECT DOCUMENTATION // ${esc(String(slug).toUpperCase())}</p>`,
      `        <h1>${esc(project.title)}</h1>`,
      project.monoSpec ? `        <p class="mono-spec">${esc(project.monoSpec)}</p>` : '',
      `        <p>${esc(project.summary)}</p>`,
      `        <p><a href="projects.html">Browse the project archive &rarr;</a></p>`,
      '      </div>',
      '    </noscript>',
    ].filter(Boolean).join('\n'),
    projects,
  };
}

function notePage(entry, project) {
  const slug = entry.slug;
  if (!slug) return null;

  const file = 'journal-' + slug + '.html';
  const url = absolute(file);
  const image = absolute(noteImage(entry, project));
  const description = clip(entry.summary || entry.subtitle || '', 300);
  const published = isoDay(entry.date);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: oneLine(entry.title),
    description,
    image,
    url,
    keywords: (entry.tags || []).join(', '),
    author: { '@type': 'Person', name: oneLine(entry.author || 'Aaruthrun'), url: BASE },
    publisher: { '@type': 'Person', name: 'Aaruthrun', url: BASE },
    isPartOf: { '@type': 'Blog', name: 'Field Notes', url: BASE + '/journal.html' },
  };
  if (published) jsonLd.datePublished = published;

  return {
    kind: 'journal',
    slug,
    file,
    title: `${oneLine(entry.title)} — Field Notes`,
    ogTitle: oneLine(entry.title),
    description,
    url,
    image,
    imageAlt: oneLine(entry.coverAlt || entry.title),
    type: 'article',
    published,
    jsonLd,
    noscript: [
      '    <noscript>',
      '      <div class="container">',
      `        <p class="mono text-muted">FIELD NOTE // ${esc(String(entry.category || 'Field note').toUpperCase())}</p>`,
      `        <h1>${esc(entry.title)}</h1>`,
      `        <p>${esc(entry.subtitle || entry.summary || '')}</p>`,
      `        <p><a href="journal.html">Back to Field Notes &rarr;</a></p>`,
      '      </div>',
      '    </noscript>',
    ].join('\n'),
  };
}

/* ------------------------------------------------------------------ */
/* Template rendering                                                  */
/* ------------------------------------------------------------------ */

function readTemplate(file) {
  const source = fs.readFileSync(file, 'utf8');
  return source;
}

function renderPage(template, page, templateFile) {
  const metaRe = /<!-- build-pages:meta:start -->[\s\S]*?<!-- build-pages:meta:end -->/;
  if (!metaRe.test(template)) {
    throw new Error(path.basename(templateFile) + ': missing build-pages:meta:start/end markers in <head>');
  }

  let html = template.replace(metaRe, () => metaBlock(page));

  // The live templates carry no data-page; only generated pages do.
  html = html.replace(/^<body([^>]*)>/m, (match, attrs) =>
    '<body' + attrs + ` data-page="${page.kind}" data-slug="${esc(page.slug)}">`);

  if (!html.includes('</main>')) {
    throw new Error(path.basename(templateFile) + ': no </main> to anchor the noscript summary');
  }
  html = html.replace('</main>', page.noscript + '\n  </main>');

  return html;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

function readJson(file) {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  return raw;
}

function build() {
  const projectsRaw = readJson('projects.json');
  const projects = Array.isArray(projectsRaw) ? projectsRaw : projectsRaw.projects || [];

  const journalRaw = readJson('journal.json');
  const entries = (journalRaw.entries || []).filter(
    (entry) => entry && entry.slug && entry.title && entry.status === 'published'
  );

  const projectTemplate = readTemplate(PROJECT_TEMPLATE);
  const entryTemplate = readTemplate(ENTRY_TEMPLATE);

  const pages = [];

  projects.forEach((project) => {
    const page = projectPage(project, projects);
    if (page) pages.push({ page, template: projectTemplate, templateFile: PROJECT_TEMPLATE });
  });

  entries.forEach((entry) => {
    const project = projects.find((candidate) => candidate.slug === entry.project) || null;
    const page = notePage(entry, project);
    if (page) pages.push({ page, template: entryTemplate, templateFile: ENTRY_TEMPLATE });
  });

  const expected = new Set(pages.map((item) => item.page.file));
  const written = [];
  const unchanged = [];

  pages.forEach(({ page, template, templateFile }) => {
    const html = renderPage(template, page, templateFile);
    const full = path.join(ROOT, page.file);
    const current = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;

    if (current === html) {
      unchanged.push(page.file);
      return;
    }
    written.push(page.file);
    if (!checkOnly) fs.writeFileSync(full, html);
  });

  // A page whose project or note was removed would otherwise linger in the
  // deployment and keep serving stale metadata. Only files this tool wrote.
  const stale = [];
  fs.readdirSync(ROOT).forEach((name) => {
    if (!GENERATED_RE.test(name) || expected.has(name)) return;
    const full = path.join(ROOT, name);
    if (!fs.statSync(full).isFile()) return;
    if (!fs.readFileSync(full, 'utf8').includes(MARKER)) return;
    stale.push(name);
    if (!checkOnly) fs.unlinkSync(full);
  });

  return { pages, written, unchanged, stale };
}

const { pages, written, unchanged, stale } = build();

const summary =
  `${pages.length} page${pages.length === 1 ? '' : 's'} ` +
  `(${pages.filter((p) => p.page.kind === 'project').length} project, ` +
  `${pages.filter((p) => p.page.kind === 'journal').length} field note) · ` +
  `${written.length} ${checkOnly ? 'stale' : 'written'} · ` +
  `${unchanged.length} unchanged · ${stale.length} removed`;

if (checkOnly) {
  if (written.length) console.error('[pages] out of date:\n  ' + written.join('\n  '));
  if (stale.length) console.error('[pages] orphaned:\n  ' + stale.join('\n  '));
  console.log('[pages] ' + summary);
  if (written.length || stale.length) {
    console.error('[pages] run `npm run pages` to regenerate.');
    process.exitCode = 1;
  }
} else {
  if (written.length) console.log('[pages] wrote:\n  ' + written.join('\n  '));
  if (stale.length) console.log('[pages] removed:\n  ' + stale.join('\n  '));
  console.log('[pages] ' + summary + ' · ' + BASE);
}
