/**
 * AARUTHRUN — FIELD NOTES POST DESK
 * Firebase Authentication + Firestore editor for the public journal.
 *
 * Published documents in `journal_posts` are merged into the journal by
 * data/content-store.js. Drafts are readable only by authenticated admins.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const gate = document.getElementById('ja-gate');
const app = document.getElementById('ja-app');
const form = document.getElementById('ja-form');
const postList = document.getElementById('ja-post-list');
const userLine = document.getElementById('ja-user');
const staticCount = document.getElementById('ja-static-count');
const modeLabel = document.getElementById('ja-mode');
const formStatus = document.getElementById('ja-form-status');
const deleteButton = document.getElementById('ja-delete');
const viewLive = document.getElementById('ja-view-live');
const preview = document.getElementById('ja-preview-article');

const today = new Date();
const todayValue = today.getFullYear() + '-' +
  String(today.getMonth() + 1).padStart(2, '0') + '-' +
  String(today.getDate()).padStart(2, '0');

const state = {
  auth: null,
  db: null,
  config: null,
  user: null,
  isAdmin: false,
  loading: false,
  remote: [],
  staticPosts: [],
  selectedSlug: null,
  slugManual: false,
  previewTimer: null
};

const categoryFallback = 'Engineering Notes';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function activeConfig() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const useEmulator = isLocal && new URLSearchParams(window.location.search).get('emulator') === '1';
  const config = useEmulator ? window.FIREBASE_EMULATOR_CONFIG : window.FIREBASE_CONFIG;
  if (!config || !config.projectId || !config.apiKey) return null;
  return config;
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : todayValue;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function tagsValue(value) {
  return String(value || '')
    .split(',')
    .map(function (tag) { return tag.trim(); })
    .filter(Boolean);
}

function readingLabel(entry) {
  const words = [entry.subtitle, entry.summary]
    .concat((entry.blocks || []).map(function (block) {
      return block.text || block.title || '';
    }))
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200)) + ' MIN READ';
}

function formatDate(value) {
  const parts = String(value || '').split('-');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  if (parts.length !== 3) return 'DATE NOT SET';
  return parts[2] + ' ' + (months[Number(parts[1]) - 1] || '') + ' ' + parts[0];
}

function setStatus(message, isError) {
  formStatus.textContent = message || '';
  formStatus.classList.toggle('is-error', Boolean(isError));
}

function authMessage(error) {
  const code = error && error.code ? error.code : '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'That email and password combination was not accepted.';
  }
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a minute and try again.';
  if (code === 'auth/network-request-failed') return 'The authentication service could not be reached.';
  return (error && error.message) || 'Sign-in failed.';
}

function showGate(html) {
  gate.hidden = false;
  app.hidden = true;
  gate.innerHTML = html;
}

function bindSignOut(button) {
  if (!button) return;
  button.addEventListener('click', function () {
    signOut(state.auth).catch(function (error) {
      console.error('[PostDesk] Sign out failed:', error);
    });
  });
}

function renderSetup() {
  showGate(
    '<div class="ja-gate-card">' +
      '<span class="ja-kicker">Publishing backend not connected</span>' +
      '<h2>Connect Firebase to publish.</h2>' +
      '<p>The editor is built, but this site has no Firebase project values yet. The public journal is still serving the eight seeded notes from <code>data/journal.json</code>.</p>' +
      '<ol class="ja-setup-list">' +
        '<li>Create a Firebase project and a Web app, then enable Email/Password authentication.</li>' +
        '<li>Add your deployed domain (and <code>127.0.0.1</code>) under Authentication → Settings → Authorized domains.</li>' +
        '<li>Create Firestore and deploy <code>firebase deploy --only firestore:rules</code>.</li>' +
        '<li>Create the editor account, copy its UID, and add an <code>admins/{UID}</code> document.</li>' +
        '<li>Fill in <code>config/firebase.config.js</code> and reload this page.</li>' +
      '</ol>' +
      '<p class="text-muted" style="font-size:.85rem">Local verification: run the Firebase emulators and open <code>journal-admin.html?emulator=1</code>.</p>' +
    '</div>'
  );
}

function renderLogin(message) {
  showGate(
    '<div class="ja-gate-card">' +
      '<span class="ja-kicker">Editor access</span>' +
      '<h2>Sign in to post.</h2>' +
      '<p>Use the email and password for the editor account. Public visitors can read the journal without signing in.</p>' +
      (message ? '<p class="ja-error">' + esc(message) + '</p>' : '') +
      '<form class="ja-login-form" id="ja-login-form">' +
        '<label class="ja-field"><span>Email</span><input id="ja-login-email" type="email" autocomplete="username" required></label>' +
        '<label class="ja-field"><span>Password</span><input id="ja-login-password" type="password" autocomplete="current-password" required></label>' +
        '<button class="ja-button is-primary" type="submit" id="ja-login-submit">Sign in</button>' +
      '</form>' +
    '</div>'
  );

  const loginForm = document.getElementById('ja-login-form');
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const button = document.getElementById('ja-login-submit');
    const email = document.getElementById('ja-login-email').value.trim();
    const password = document.getElementById('ja-login-password').value;
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      await signInWithEmailAndPassword(state.auth, email, password);
    } catch (error) {
      renderLogin(authMessage(error));
    }
  });
}

function renderNotAdmin() {
  showGate(
    '<div class="ja-gate-card">' +
      '<span class="ja-kicker">Signed in, not authorised</span>' +
      '<h2>This account cannot publish.</h2>' +
      '<p>Only Auth users with an <code>admins/{uid}</code> Firestore document can open the editor. Add that document in the Firebase console for this account.</p>' +
      '<code class="ja-uid">UID · ' + esc(state.user ? state.user.uid : '') + '</code>' +
      '<p style="margin-top:18px"><button class="ja-button" type="button" id="ja-gate-signout">Sign out</button></p>' +
    '</div>'
  );
  bindSignOut(document.getElementById('ja-gate-signout'));
}

async function fetchStaticPosts() {
  try {
    const response = await fetch('./data/journal.json', { cache: 'no-cache' });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.entries || []).filter(function (entry) { return !entry.template; });
  } catch (error) {
    return [];
  }
}

async function populateProjects() {
  const select = document.getElementById('ja-project');
  if (!select || select.options.length > 1) return;
  try {
    const response = await fetch('./data/projects.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const projects = await response.json();
    (projects || []).forEach(function (project) {
      if (!project.slug) return;
      const option = document.createElement('option');
      option.value = project.slug;
      option.textContent = project.shortTitle || project.title || project.slug;
      select.appendChild(option);
    });
  } catch (error) {
    // A missing project archive should not block the editor.
  }
}

function blockText(block) {
  if (!block) return '';
  if (block.type === 'image') return block.alt || '';
  if (block.type === 'image-grid') return (block.images || []).map(blockText).join(' ');
  return block.text || block.title || '';
}

function blocksToBody(blocks) {
  return (blocks || []).map(function (block) {
    switch (block.type) {
      case 'paragraph':
        return block.text || '';
      case 'heading':
        return '#'.repeat(Math.min(3, Math.max(2, Number(block.level) || 2))) + ' ' + (block.text || '');
      case 'list':
        return (block.items || []).map(function (item, index) {
          return (block.ordered ? (index + 1) + '. ' : '- ') + item;
        }).join('\n');
      case 'quote':
        return '> ' + (block.text || '') + (block.attribution ? '\n> — ' + block.attribution : '');
      case 'callout':
        return '> [!NOTE] ' + (block.title || '') + (block.text ? '\n> ' + block.text : '');
      case 'code':
        return '```' + (block.language || '') + (block.filename ? ' ' + block.filename : '') + '\n' +
          (block.code || '') + '\n```';
      case 'image':
        return '![' + (block.alt || '') + '](' + (block.src || '') +
          (block.caption ? ' "' + block.caption + '"' : '') + ')';
      case 'image-grid':
        return (block.images || []).map(function (image) {
          return '![' + (image.alt || '') + '](' + (image.src || '') +
            (image.caption ? ' "' + image.caption + '"' : '') + ')';
        }).join('\n');
      case 'table':
        return '| ' + (block.head || []).join(' | ') + ' |\n| ' +
          (block.head || []).map(function () { return '---'; }).join(' | ') + ' |\n' +
          (block.rows || []).map(function (row) {
            return '| ' + (row.cells || row).join(' | ') + ' |';
          }).join('\n');
      case 'divider':
        return '---';
      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

function isBlockStart(line) {
  return /^\s*$/.test(line) ||
    /^```/.test(line) ||
    /^#{2,3}\s+/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^!\[/.test(line) ||
    /^\|/.test(line) ||
    /^---+$/.test(line.trim());
}

function tableCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) {
    return cell.trim();
  });
}

function parseBody(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const opener = line.trim().slice(3).trim().split(/\s+/);
      const language = opener[0] || '';
      const filename = opener.slice(1).join(' ') || '';
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      if (code.length) blocks.push({ type: 'code', language: language, filename: filename, code: code.join('\n') });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'divider' });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)\s*$/);
    if (image) {
      blocks.push({ type: 'image', src: image[2], alt: image[1], caption: image[3] || '' });
      index += 1;
      continue;
    }

    if (/^\|/.test(line.trim()) && index + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[index + 1].trim())) {
      const head = tableCells(line);
      const rows = [];
      index += 2;
      while (index < lines.length && /^\|/.test(lines[index].trim())) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'table', head: head, rows: rows });
      continue;
    }

    if (/^>\s?/.test(line.trim())) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      const first = quoteLines[0] || '';
      const callout = first.match(/^\[!(NOTE|TIP|WARNING)\]\s*(.*)$/i);
      if (callout) {
        blocks.push({
          type: 'callout',
          title: callout[2] || callout[1],
          text: quoteLines.slice(1).join(' ')
        });
      } else {
        let attribution = '';
        if (quoteLines.length > 1 && /^[—-]\s*/.test(quoteLines[quoteLines.length - 1].trim())) {
          attribution = quoteLines.pop().trim().replace(/^[—-]\s*/, '');
        }
        blocks.push({ type: 'quote', text: quoteLines.join(' '), attribution: attribution });
      }
      continue;
    }

    if (/^[-*]\s+/.test(line.trim())) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'list', ordered: false, items: items });
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'list', ordered: true, items: items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function storageBlocks(blocks) {
  // Firestore rejects arrays nested directly inside arrays. Keep table rows as
  // maps so the schema survives a round trip; ContentBlocks accepts both forms.
  return (blocks || []).map(function (block) {
    if (!block || block.type !== 'table') return block;
    return Object.assign({}, block, {
      rows: (block.rows || []).map(function (row) {
        return { cells: Array.isArray(row) ? row : (row.cells || []) };
      })
    });
  });
}

function readForm() {
  return {
    title: document.getElementById('ja-title').value.trim(),
    slug: document.getElementById('ja-slug').value.trim(),
    date: document.getElementById('ja-date').value,
    category: document.getElementById('ja-category').value.trim() || categoryFallback,
    project: document.getElementById('ja-project').value,
    tags: tagsValue(document.getElementById('ja-tags').value),
    cover: document.getElementById('ja-cover').value.trim(),
    coverAlt: document.getElementById('ja-cover-alt').value.trim(),
    subtitle: document.getElementById('ja-subtitle').value.trim(),
    summary: document.getElementById('ja-summary').value.trim(),
    body: document.getElementById('ja-body').value,
    featured: document.getElementById('ja-featured').checked,
    status: document.getElementById('ja-status').value
  };
}

function validate(values) {
  if (!values.title) return 'Add a title.';
  if (values.title.length > 200) return 'Keep the title under 200 characters.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) return 'Use a slug of lowercase letters, numbers and hyphens.';
  if (values.slug.length > 80) return 'Keep the slug under 80 characters.';
  if (!values.date || !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) return 'Choose a publication date.';
  if (values.category.length > 80) return 'Keep the category under 80 characters.';
  if (values.project.length > 80) return 'Choose a shorter project reference.';
  if (values.subtitle.length > 300) return 'Keep the subtitle under 300 characters.';
  if (!values.summary) return 'Add a summary for the journal index.';
  if (values.summary.length > 1200) return 'Keep the summary under 1,200 characters.';
  if (values.cover.length > 2000) return 'Keep the cover path under 2,000 characters.';
  if (values.coverAlt.length > 300) return 'Keep the cover alt text under 300 characters.';
  if (values.tags.length > 20) return 'Use no more than 20 tags.';
  if (!values.body.trim()) return 'Write the post body.';
  if (values.body.length > 100000) return 'Keep the post body under 100,000 characters.';
  const blocks = parseBody(values.body);
  if (blocks.length === 0) return 'The body did not produce any readable blocks.';
  if (blocks.length > 200) return 'The body has too many blocks. Keep it under 200.';
  if (state.staticPosts.some(function (entry) { return entry.slug === values.slug; }) &&
      !state.remote.some(function (entry) { return entry.slug === values.slug; })) {
    return 'That slug belongs to a seeded post. Choose a different slug.';
  }
  return '';
}

function renderPreview() {
  const values = readForm();
  if (!values.title && !values.body.trim()) {
    preview.innerHTML = '<p class="mono text-muted">Start writing to preview the post.</p>';
    return;
  }

  const blocks = parseBody(values.body);
  const coverUrl = ContentBlocks.safeUrl(values.cover);
  const cover = coverUrl
    ? '<figure class="ja-preview-cover"><img src="' + coverUrl + '" alt="' + esc(values.coverAlt || values.title) + '"></figure>'
    : '';

  preview.innerHTML =
    '<div class="ja-preview-kicker"><span>' + esc(values.category) + '</span><span>' + esc(formatDate(values.date)) + '</span><span>' + esc(readingLabel(Object.assign({}, values, { blocks: blocks }))) + '</span></div>' +
    '<h1>' + esc(values.title || 'Untitled field note') + '</h1>' +
    (values.subtitle ? '<p class="ja-preview-deck">' + esc(values.subtitle) + '</p>' : '') +
    cover +
    '<div class="entry-body fn-prose">' + (blocks.length ? ContentBlocks.render(blocks) : '<p class="ja-preview-placeholder">No body blocks yet.</p>') + '</div>';
}

function schedulePreview() {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(renderPreview, 90);
}

function fillForm(entry) {
  state.selectedSlug = entry.slug;
  state.slugManual = true;

  document.getElementById('ja-title').value = entry.title || '';
  const slugInput = document.getElementById('ja-slug');
  slugInput.value = entry.slug || '';
  slugInput.readOnly = true;
  document.getElementById('ja-date').value = isoDate(entry.date);
  document.getElementById('ja-category').value = entry.category || categoryFallback;
  document.getElementById('ja-project').value = entry.project || '';
  document.getElementById('ja-tags').value = (entry.tags || []).join(', ');
  document.getElementById('ja-cover').value = entry.cover || entry.thumb || '';
  document.getElementById('ja-cover-alt').value = entry.coverAlt || '';
  document.getElementById('ja-subtitle').value = entry.subtitle || '';
  document.getElementById('ja-summary').value = entry.summary || '';
  document.getElementById('ja-body').value = entry.body || blocksToBody(entry.blocks);
  document.getElementById('ja-featured').checked = Boolean(entry.featured);
  document.getElementById('ja-status').value = entry.status === 'published' ? 'published' : 'draft';

  modeLabel.textContent = 'Editing / ' + entry.slug;
  deleteButton.hidden = false;
  viewLive.hidden = entry.status !== 'published';
  viewLive.href = 'journal-entry.html?slug=' + encodeURIComponent(entry.slug) +
    (state.config && state.config.useEmulator ? '&emulator=1' : '');
  setStatus('');
  renderPreview();
  renderList();
}

function resetForm() {
  state.selectedSlug = null;
  state.slugManual = false;
  form.reset();
  document.getElementById('ja-slug').readOnly = false;
  document.getElementById('ja-date').value = todayValue;
  document.getElementById('ja-category').value = categoryFallback;
  document.getElementById('ja-status').value = 'draft';
  document.getElementById('ja-featured').checked = false;
  modeLabel.textContent = 'New field note';
  deleteButton.hidden = true;
  viewLive.hidden = true;
  setStatus('');
  renderPreview();
  renderList();
  document.getElementById('ja-title').focus();
}

async function loadRemotePosts() {
  const snapshot = await getDocs(collection(state.db, 'journal_posts'));
  state.remote = snapshot.docs.map(function (item) {
    return Object.assign({}, item.data(), { slug: item.id });
  }).filter(function (entry) { return entry.slug; }).sort(function (a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''));
  });
}

function renderList() {
  if (!postList) return;
  if (!state.remote.length) {
    postList.innerHTML = '<p class="mono text-muted" style="padding:14px 0">No remote posts yet. Write the first one.</p>';
  } else {
    postList.innerHTML = state.remote.map(function (entry) {
      const badge = entry.status === 'published' ? 'is-published">LIVE' : 'is-draft">DRAFT';
      return '<button class="ja-post-item' + (entry.slug === state.selectedSlug ? ' is-active' : '') + '" type="button" data-slug="' + esc(entry.slug) + '">' +
        '<span class="ja-post-meta"><span>' + esc(formatDate(entry.date)) + '</span><span class="ja-badge ' + badge + '</span></span>' +
        '<span class="ja-post-title">' + esc(entry.title || entry.slug) + '</span>' +
      '</button>';
    }).join('');
  }

  postList.querySelectorAll('[data-slug]').forEach(function (button) {
    button.addEventListener('click', function () {
      const entry = state.remote.find(function (item) { return item.slug === button.getAttribute('data-slug'); });
      if (entry) fillForm(entry);
    });
  });

  staticCount.textContent = state.staticPosts.length + ' seeded notes stay in data/journal.json';
}

async function enterEditor() {
  gate.hidden = true;
  app.hidden = false;
  userLine.textContent = 'SIGNED IN · ' + (state.user.email || state.user.uid);
  staticCount.textContent = state.staticPosts.length + ' seeded notes stay in data/journal.json';
  await populateProjects();
  await loadRemotePosts();
  renderList();
  resetForm();
}

async function savePost(statusOverride) {
  if (!state.isAdmin || state.loading) return;
  const values = readForm();
  values.status = statusOverride || values.status;
  document.getElementById('ja-status').value = values.status;

  const error = validate(values);
  if (error) {
    setStatus(error, true);
    return;
  }

  state.loading = true;
  const saveButton = document.getElementById('ja-save');
  const publishButton = document.getElementById('ja-publish');
  saveButton.disabled = true;
  publishButton.disabled = true;
  setStatus(values.status === 'published' ? 'Publishing…' : 'Saving draft…');

  try {
    const existing = state.remote.find(function (entry) { return entry.slug === values.slug; });
    const payload = {
      slug: values.slug,
      title: values.title,
      subtitle: values.subtitle,
      summary: values.summary,
      date: values.date,
      category: values.category,
      project: values.project,
      tags: values.tags,
      cover: values.cover,
      thumb: values.cover,
      coverAlt: values.coverAlt,
      featured: values.featured,
      status: values.status,
      author: 'Aaruthrun',
      body: values.body,
      blocks: storageBlocks(parseBody(values.body)),
      updatedAt: serverTimestamp()
    };
    payload.createdAt = existing && existing.createdAt ? existing.createdAt : serverTimestamp();
    if (values.status === 'published') {
      payload.publishedAt = existing && existing.publishedAt ? existing.publishedAt : serverTimestamp();
    }

    await setDoc(doc(state.db, 'journal_posts', values.slug), payload);
    await loadRemotePosts();
    const saved = state.remote.find(function (entry) { return entry.slug === values.slug; });
    if (saved) fillForm(saved);
    setStatus(values.status === 'published' ? 'Published. The public journal now includes this note.' : 'Draft saved. It is not visible to visitors.');
  } catch (firebaseError) {
    console.error('[PostDesk] Save failed:', firebaseError);
    setStatus('Could not save: ' + (firebaseError.message || 'unknown Firestore error'), true);
  } finally {
    state.loading = false;
    saveButton.disabled = false;
    publishButton.disabled = false;
  }
}

async function removePost() {
  if (!state.selectedSlug || !state.isAdmin) return;
  const entry = state.remote.find(function (item) { return item.slug === state.selectedSlug; });
  if (!entry) return;
  if (!window.confirm('Delete “' + (entry.title || entry.slug) + '”? This cannot be undone.')) return;

  setStatus('Deleting…');
  try {
    await deleteDoc(doc(state.db, 'journal_posts', state.selectedSlug));
    await loadRemotePosts();
    resetForm();
    setStatus('Post deleted.');
  } catch (error) {
    console.error('[PostDesk] Delete failed:', error);
    setStatus('Could not delete: ' + (error.message || 'unknown Firestore error'), true);
  }
}

function bindForm() {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    savePost();
  });

  document.getElementById('ja-publish').addEventListener('click', function () {
    savePost('published');
  });

  deleteButton.addEventListener('click', removePost);
  document.getElementById('ja-new').addEventListener('click', resetForm);
  document.getElementById('ja-signout').addEventListener('click', function () {
    signOut(state.auth);
  });

  form.addEventListener('input', function (event) {
    if (event.target.id === 'ja-title' && !state.slugManual && !state.selectedSlug) {
      document.getElementById('ja-slug').value = slugify(event.target.value);
    }
    if (event.target.id === 'ja-slug') state.slugManual = true;
    schedulePreview();
  });

  form.addEventListener('change', schedulePreview);
}

async function init() {
  bindForm();
  renderPreview();

  state.config = activeConfig();
  if (!state.config) {
    renderSetup();
    return;
  }

  try {
    const firebaseApp = initializeApp(state.config);
    state.auth = getAuth(firebaseApp);
    state.db = getFirestore(firebaseApp);

    if (state.config.useEmulator) {
      connectAuthEmulator(state.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(state.db, '127.0.0.1', 8081);
    }

    state.staticPosts = await fetchStaticPosts();

    onAuthStateChanged(state.auth, async function (user) {
      state.user = user;
      if (!user) {
        state.isAdmin = false;
        renderLogin();
        return;
      }

      showGate('<div class="ja-gate-card"><p class="mono text-muted">Checking editor permissions…</p></div>');
      try {
        const adminDoc = await getDoc(doc(state.db, 'admins', user.uid));
        state.isAdmin = adminDoc.exists() && adminDoc.data().role === 'editor';
      } catch (error) {
        state.isAdmin = false;
      }

      if (!state.isAdmin) {
        renderNotAdmin();
        return;
      }

      try {
        await enterEditor();
      } catch (error) {
        console.error('[PostDesk] Unable to load posts:', error);
        showGate('<div class="ja-gate-card"><p class="ja-error">Signed in, but the post library could not be loaded. Check the Firestore rules and network connection.</p><p><button class="ja-button" type="button" id="ja-gate-retry">Sign out</button></p></div>');
        bindSignOut(document.getElementById('ja-gate-retry'));
      }
    });
  } catch (error) {
    console.error('[PostDesk] Firebase initialization failed:', error);
    showGate('<div class="ja-gate-card"><p class="ja-error">Firebase could not start. Check <code>config/firebase.config.js</code> and the network connection.</p></div>');
  }
}

init();
