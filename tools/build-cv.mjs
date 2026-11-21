#!/usr/bin/env node
/**
 * CV BUILD — one source of truth for the Curriculum Vitae
 *
 *   node tools/build-cv.mjs           rewrite the generated sections
 *   node tools/build-cv.mjs --check   fail if cv.html is out of date
 *
 * cv.html used to repeat the education record, the skills matrix and the
 * selected projects by hand, so it drifted from the archive (it still listed
 * a project that no longer existed). Those three blocks are now generated
 * between markers from the same data the rest of the site reads:
 *
 *   data/timeline.json              -> Education
 *   config/app.config.js            -> Skills
 *   data/projects.json              -> Selected projects
 *
 * Everything else in cv.html (header, experience, footer) stays hand-written.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CV = path.join(ROOT, 'cv.html');
const checkOnly = process.argv.includes('--check');

const esc = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function skillsDomains() {
  const source = fs.readFileSync(path.join(ROOT, 'config', 'app.config.js'), 'utf8');
  const sandbox = {
    window: { location: { origin: 'http://localhost', pathname: '/' } },
    document: {},
    localStorage: { getItem: () => null },
  };
  vm.runInNewContext(
    source + '\n;globalThis.__skills = AppConfig.getSkillsDomains();',
    sandbox,
    { timeout: 1000 }
  );
  return sandbox.__skills || [];
}

const firstSentence = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  const stop = text.search(/\.\s/);
  return stop === -1 ? text : text.slice(0, stop + 1);
};

function educationBlock() {
  const timeline = readJson('data/timeline.json');
  const entries = (timeline.events || []).filter((event) => event.type === 'Education');
  return entries.map((entry) =>
    '            <div class="cv-degree">\n' +
    '              <h3>' + esc(entry.title) + '</h3>\n' +
    '              <p class="cv-institution">' + esc(entry.detail) + '</p>\n' +
    '              <p class="cv-dates">' + esc(entry.dateLabel || 'Dates not recorded') + '</p>\n' +
    '            </div>'
  ).join('\n');
}

function skillsBlock() {
  return skillsDomains().map((domain) =>
    '            <div class="cv-skill-group">\n' +
    '              <h3>' + esc(domain.title) + '</h3>\n' +
    '              <ul>\n' +
    (domain.skills || []).map((skill) =>
      '                <li>' + esc(skill.name) + (skill.note ? ' — ' + esc(skill.note) : '') + '</li>'
    ).join('\n') + '\n' +
    '              </ul>\n' +
    '            </div>'
  ).join('\n\n');
}

function projectsBlock() {
  const projects = readJson('data/projects.json');
  const picks = (Array.isArray(projects) ? projects : projects.projects || [])
    .filter((project) => project && project.slug)
    .sort((a, b) => (a.featuredRank || 99) - (b.featuredRank || 99))
    .slice(0, 4);

  return picks.map((project) =>
    '            <div class="cv-project">\n' +
    '              <h3><a href="project-' + esc(project.slug) + '.html">' +
      esc(project.shortTitle || project.title) + '</a></h3>\n' +
    '              <p>' + esc(firstSentence(project.summary)) + '</p>\n' +
    '            </div>'
  ).join('\n');
}

function splice(html, name, body) {
  const start = `<!-- cv:${name}:start -->`;
  const end = `<!-- cv:${name}:end -->`;
  const startAt = html.indexOf(start);
  const endAt = html.indexOf(end);
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    throw new Error(`cv.html: missing ${start} / ${end} markers`);
  }
  return html.slice(0, startAt + start.length) + '\n' + body + '\n            ' + html.slice(endAt);
}

const current = fs.readFileSync(CV, 'utf8');
let next = current;
next = splice(next, 'education', educationBlock());
next = splice(next, 'skills', skillsBlock());
next = splice(next, 'projects', projectsBlock());

if (next === current) {
  console.log('[cv] cv.html is up to date');
} else if (checkOnly) {
  console.error('[cv] cv.html is out of date; run `npm run cv`');
  process.exitCode = 1;
} else {
  fs.writeFileSync(CV, next);
  console.log('[cv] cv.html regenerated from timeline, skills config and project archive');
}
