#!/usr/bin/env node
/** 
 * AARUTHRUN PORTFOLIO — SITE HEALTH CHECK
 * Replaces 17 one-off debug scripts with a single npm check.
 * Checks: broken internal links, missing assets, missing alt text, oversized images.
 * Usage: npm run check
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve('.');
const HTML_EXT = ['.html'];
const IMAGE_EXT = ['.webp', '.jpg', '.png', '.jpeg', '.svg'];

// ---- Discover all HTML files ----
const allFiles = readdirSync(PROJECT_ROOT);
const htmlFiles = allFiles.filter(f => {
  const lower = f.toLowerCase();
  return HTML_EXT.some(ext => lower.endsWith(ext));
}).map(f => resolve(PROJECT_ROOT, f));

// ---- Discover all project JSON entries ----
const projectsJsonPath = resolve(PROJECT_ROOT, 'data/projects.json');
let projects = [];
if (existsSync(projectsJsonPath)) {
  projects = JSON.parse(readFileSync(projectsJsonPath, 'utf-8'));
}

// ---- Build a map of existing pages ----
const existingPages = new Set();
htmlFiles.forEach(path => {
  const base = path.replace(/\.[^/.]+$/, '');
  existingPages.add(base);
  existingPages.add(base + '.html');
});

// ---- Check 1: Broken internal links in HTML ----
function checkBrokenLinks() {
  const issues = [];
  let totalLinks = 0;

  for (const htmlFile of htmlFiles) {
    const content = readFileSync(htmlFile, 'utf-8');
    // Match href attributes
    const matches = content.match(/href="([^"]*)"/g) || [];
    for (const m of matches) {
      const href = m.slice(6, -1); // strip href="
      totalLinks++;
      // Check if it's an internal link (no protocol, no mailto/tel)
      // Cache-busting queries and in-page anchors are not part of the file
      // path: "page.html?v=2026-11" and "page.html#section" both mean page.html.
      const pathPart = (href || '').split('#')[0].split('?')[0];

      if (pathPart && !pathPart.startsWith('http://') && !pathPart.startsWith('https://') && !pathPart.startsWith('mailto:') && !pathPart.startsWith('tel:')) {
        // Resolve relative to the file's directory
        const fileDir = PROJECT_ROOT;
        const resolved = resolve(fileDir, pathPart);
        const pageName = resolved.replace(/\.[^/.]+$/, '');

        // Check if the target exists: a page, or any real file (stylesheets,
        // scripts, images, downloads) referenced by href.
        const targetExists =
          existingPages.has(pageName) ||
          existingPages.has(resolved) ||
          existsSync(resolved);

        if (!targetExists && !pathPart.startsWith('#')) {
          issues.push({
            type: 'broken-link',
            file: htmlFile.replace(PROJECT_ROOT + '/', ''),
            link: href,
            target: pageName,
            context: m.trim()
          });
        }
      }
    }
  }

  return { issues, totalLinks };
}

// ---- Check 2: Missing alt text on img tags ----
function checkMissingAlt() {
  const issues = [];

  for (const htmlFile of htmlFiles) {
    const content = readFileSync(htmlFile, 'utf-8');
    // Find img tags without alt
    const imgRegex = /<img[^>]*>/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      const tag = match[0];
      // Check for alt attribute
      const hasAlt = tag.includes('alt=') || new RegExp('alt\\s*=', 'i').test(tag);
      if (!hasAlt) {
        // Extract src
        const srcMatch = tag.match(/src="([^"]*)"/);
        const src = srcMatch ? srcMatch[1] : 'unknown';
        issues.push({
          type: 'missing-alt',
          file: htmlFile.replace(PROJECT_ROOT + '/', ''),
          src,
          tag: tag.slice(0, 80) + (tag.length > 80 ? '...' : '')
        });
      }
    }
  }

  return issues;
}

// ---- Check 3: Project image assets vs actual files ----
function checkProjectImages() {
  const issues = [];

  for (const project of projects) {
    // Check cover image
    if (project.image) {
      const coverPath = resolve(PROJECT_ROOT, project.image);
      const coverExists = existsSync(coverPath);
      if (!coverExists) {
        issues.push({
          type: 'missing-cover',
          slug: project.slug,
          path: project.image
        });
      }
    }

    // Check project images array
    if (project.images && Array.isArray(project.images)) {
      for (const img of project.images) {
        const imgPath = resolve(PROJECT_ROOT, img);
        const imgExists = existsSync(imgPath);
        if (!imgExists) {
          issues.push({
            type: 'missing-project-image',
            slug: project.slug,
            path: img
          });
        }
      }
    }

    // Check archiveImage
    if (project.archiveImage) {
      const archivePath = resolve(PROJECT_ROOT, project.archiveImage);
      const archiveExists = existsSync(archivePath);
      if (!archiveExists) {
        issues.push({
          type: 'missing-archive-image',
          slug: project.slug,
          path: project.archiveImage
        });
      }
    }

    // Check thumbImage
    if (project.thumbImage) {
      const thumbPath = resolve(PROJECT_ROOT, project.thumbImage);
      const thumbExists = existsSync(thumbPath);
      if (!thumbExists) {
        issues.push({
          type: 'missing-thumb-image',
          slug: project.slug,
          path: project.thumbImage
        });
      }
    }
  }

  return issues;
}

// ---- Check 4: Gallery HTML structure ----
function checkGalleryHTML() {
  const issues = [];
  const galleryHtml = resolve(PROJECT_ROOT, 'gallery.html');
  if (existsSync(galleryHtml)) {
    const content = readFileSync(galleryHtml, 'utf-8');
    const structureChecks = {
      'DOCTYPE html': content.includes('<!DOCTYPE html>'),
      'html lang=en': content.includes('lang="en"') || content.includes('lang=en'),
      'head section': content.includes('<head>'),
      'body tag': content.includes('<body'),
      'gallery-viewport': content.includes('gallery-viewport'),
      'gallery-canvas': content.includes('gallery-canvas'),
      'js/gallery.js': content.includes('js/gallery.js')
    };

    for (const [name, found] of Object.entries(structureChecks)) {
      if (!found) {
        issues.push({
          type: 'missing-structure',
          check: name,
          file: 'gallery.html'
        });
      }
    }
  } else {
    issues.push({
      type: 'missing-file',
      file: 'gallery.html'
    });
  }
  return issues;
}

// ---- Check 5: Oversized images by file size ----
function checkOversizedImages() {
  const issues = [];

  // Check home page images by file size (proxy for dimensions > 2400px)
  const homeDir = resolve(PROJECT_ROOT, 'images/home');
  if (existsSync(homeDir)) {
    const homeFiles = readdirSync(homeDir).filter(f => {
      const lower = f.toLowerCase();
      return IMAGE_EXT.some(ext => lower.endsWith(ext));
    });
    for (const f of homeFiles) {
      const path = resolve(homeDir, f);
      try {
        const stat = statSync(path);
        // Heuristic: files over 500KB are likely oversized images
        if (stat.size > 500 * 1024) {
          issues.push({
            type: 'oversized-image',
            file: f,
            sizeKB: Math.round(stat.size / 1024),
            path: 'images/home/' + f,
            note: 'Likely oversized; consider web-sized variants'
          });
        }
      } catch (e) {}
    }
  }

  // Check project archive images by file size
  for (const project of projects) {
    if (project.archiveImage) {
      const archivePath = resolve(PROJECT_ROOT, project.archiveImage);
      if (existsSync(archivePath)) {
        try {
          const stat = statSync(archivePath);
          if (stat.size > 500 * 1024) {
            issues.push({
              type: 'oversized-image',
              file: project.archiveImage,
              sizeKB: Math.round(stat.size / 1024),
              slug: project.slug,
              note: `project ${project.slug} archive cover`
            });
          }
        } catch (e) {}
      }
    }
  }

  return issues;
}

// ---- Main ----
// ---- Check 6: link-preview card ----
// A 200 with the right content type is not enough: WhatsApp paints a black
// rectangle for progressive JPEGs, so the encoding itself is asserted here.
function jpegFrameInfo(buf) {
  let i = 2;
  while (i < buf.length - 3) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = buf.readUInt16BE(i + 2);
    // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        progressive: marker === 0xc2,
        height: buf.readUInt16BE(i + 5),
        width: buf.readUInt16BE(i + 7),
      };
    }
    i += 2 + length;
  }
  return null;
}

function checkShareCard() {
  const issues = [];
  const card = resolve(PROJECT_ROOT, 'images/og-image.jpg');

  if (!existsSync(card)) {
    issues.push({ type: 'Missing share card', file: 'images/og-image.jpg', check: 'og-image' });
    return issues;
  }

  const bytes = statSync(card).size;
  if (bytes > 300 * 1024) {
    issues.push({ type: 'Share card over 300 KB', file: `images/og-image.jpg (${Math.round(bytes / 1024)} KB)`, check: 'og-image' });
  }

  const frame = jpegFrameInfo(readFileSync(card));
  if (!frame) {
    issues.push({ type: 'Share card is not a JPEG', file: 'images/og-image.jpg', check: 'og-image' });
  } else {
    if (frame.width !== 1200 || frame.height !== 630) {
      issues.push({ type: 'Share card is not 1200x630', file: `images/og-image.jpg is ${frame.width}x${frame.height}`, check: 'og-image' });
    }
    if (frame.progressive) {
      issues.push({ type: 'Share card is progressive (WhatsApp renders it black)', file: 'images/og-image.jpg', check: 'og-image' });
    }
  }

  const html = readFileSync(resolve(PROJECT_ROOT, 'index.html'), 'utf-8');
  const meta = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (!meta || !/^https:\/\//.test(meta[1])) {
    issues.push({ type: 'og:image is not an absolute https URL', file: 'index.html', check: 'og-image' });
  }

  return issues;
}

function main() {
  console.log('='.repeat(60));
  console.log('AARUTHRUN PORTFOLIO — SITE HEALTH CHECK');
  console.log('='.repeat(60));

  const allIssues = [];
  const results = {};

  // 1. Broken internal links
  console.log('\n[1/6] Checking broken internal links...');
  const linkResult = checkBrokenLinks();
  results.brokenLinks = linkResult;
  console.log(`  Total links examined: ${linkResult.totalLinks}`);
  console.log(`  Broken links found: ${linkResult.issues.length}`);
  allIssues.push(...linkResult.issues.map(i => ({ ...i, category: 'link' })));

  // 2. Missing alt text
  console.log('[2/6] Checking missing alt text...');
  const altResult = checkMissingAlt();
  results.missingAlt = altResult;
  console.log(`  Missing alt found: ${altResult.length}`);
  allIssues.push(...altResult.map(i => ({ ...i, category: 'accessibility' })));

  // 3. Project image assets
  console.log('[3/6] Checking project image assets...');
  const projResult = checkProjectImages();
  results.projectImages = projResult;
  console.log(`  Missing assets found: ${projResult.length}`);
  allIssues.push(...projResult.map(i => ({ ...i, category: 'asset' })));

  // 4. Gallery HTML structure
  console.log('[4/6] Checking gallery.html structure...');
  const galleryResult = checkGalleryHTML();
  results.galleryHTML = galleryResult;
  console.log(`  Structure issues: ${galleryResult.length}`);
  allIssues.push(...galleryResult.map(i => ({ ...i, category: 'structure' })));

  // 5. Oversized images
  console.log('[5/6] Checking oversized images...');
  const oversizedResult = checkOversizedImages();
  results.oversizedImages = oversizedResult;
  console.log(`  Oversized images found: ${oversizedResult.length}`);
  allIssues.push(...oversizedResult.map(i => ({ ...i, category: 'performance' })));

  // 6. Link-preview card
  console.log('\n[6/6] Checking the link-preview card...');
  const shareResult = checkShareCard();
  results.shareCard = shareResult;
  console.log(`  Share card issues: ${shareResult.length}`);
  allIssues.push(...shareResult.map(i => ({ ...i, category: 'share' })));

  // ---- Summary ----
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const byCategory = {
    link: results.brokenLinks.issues.length,
    accessibility: results.missingAlt.length,
    asset: results.projectImages.length,
    performance: results.oversizedImages.length,
    structure: results.galleryHTML.length,
    share: results.shareCard.length
  };

  let total = 0;
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count}`);
    total += count;
  }
  console.log(`  TOTAL: ${total}`);

  if (total === 0) {
    console.log('\n✅ All checks passed — no issues found!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Issues found. See details above.');
    // List first few issues of each type
    for (const [cat, count] of Object.entries(byCategory)) {
      if (count > 0) {
        console.log(`\n  ${cat.toUpperCase()} issues:`);
        const issues = allIssues.filter(i => i.category === cat);
        issues.slice(0, 3).forEach(i => {
          const desc = i.file || i.slug || i.check || '';
          console.log(`    - ${i.type}: ${desc}`);
        });
      }
    }
    process.exit(1);
  }
}

main();