#!/usr/bin/env node
/**
 * PHOTO FILENAME MIGRATION
 *
 *   node tools/rename-photos.mjs
 *
 * Camera exports and CAD viewers produce names like
 *   "WhatsApp Image 2026-03-17 at 9.46.42 PM.jpeg"
 *   "hex_pod_2026-Jul-21_03-12-33PM-000_CustomizedView37072144927_jpg.jpg"
 * They break URLs, sort badly and read as noise in a project folder. This
 * renames them to <slug>-NN.jpg, keeping the running order from
 * data/projects.json, and records any date that lived in the old filename in
 * the folder's project.json captions so the gallery keeps its dates.
 *
 * Run once; it is a no-op when no matching files remain.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_JSON = path.join(ROOT, 'data', 'projects.json');
const PROJECTS_DIR = path.join(ROOT, 'images', 'projects');
const NOISY = /WhatsApp|CustomizedView/i;
const DATE_RE = /(20\d{2}|19\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?!\d)/;

const projects = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf8'));
let raw = fs.readFileSync(PROJECTS_JSON, 'utf8');
let renamed = 0;

for (const project of projects) {
  const slug = project.slug;
  if (!slug) continue;
  const folder = path.join(PROJECTS_DIR, slug);
  if (!fs.existsSync(folder)) continue;

  const matches = fs.readdirSync(folder).filter((name) => NOISY.test(name));
  if (!matches.length) continue;

  // Order by the project's own image list so the archive keeps its sequence.
  const order = (project.images || []).map((src) => path.basename(String(src)));
  const ordered = matches.slice().sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'en', { numeric: true });
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const existingSidecarPath = path.join(folder, 'project.json');
  const sidecar = fs.existsSync(existingSidecarPath)
    ? JSON.parse(fs.readFileSync(existingSidecarPath, 'utf8'))
    : {};
  sidecar.captions = sidecar.captions || {};

  ordered.forEach((oldName, index) => {
    const parsed = path.parse(oldName);
    const newName = `${slug}-${String(index + 1).padStart(2, '0')}.jpg`;
    const oldRel = `images/projects/${slug}/${oldName}`;
    const newRel = `images/projects/${slug}/${newName}`;

    fs.renameSync(path.join(folder, oldName), path.join(folder, newName));

    const dateMatch = parsed.name.match(DATE_RE);
    if (dateMatch && !sidecar.captions[newName]) {
      sidecar.captions[newName] = { date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` };
    }

    // Every reference in the data file carries the old path.
    raw = raw.split(oldRel).join(newRel);
    renamed++;
    console.log(`${oldRel}\n  -> ${newRel}`);
  });

  fs.writeFileSync(existingSidecarPath, JSON.stringify(sidecar, null, 2) + '\n');
}

if (!renamed) {
  console.log('[rename] no noisy filenames left');
} else {
  fs.writeFileSync(PROJECTS_JSON, raw);
  console.log(`[rename] ${renamed} photo(s) renamed · dates preserved in project.json captions`);
}
