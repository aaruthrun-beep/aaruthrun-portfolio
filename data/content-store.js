/**
 * AARUTHRUN PORTFOLIO — CONTENT STORE
 * Reads the structured content files that sit outside the UI modules:
 * journal entries, skills taxonomy, engineering timeline and homepage curation.
 * Small, cached, and independent of the project archive store.
 *
 * Published Field Notes can also live in Firestore (the authenticated post
 * editor writes there). When Firebase is configured, those entries are merged
 * over data/journal.json by slug; without configuration the site stays static.
 */

const ContentStore = (function () {
  'use strict';

  const cache = {};
  const cacheDuration = 5 * 60 * 1000;
  const remoteCacheDuration = 60 * 1000;
  let remoteCache = null;

  async function get(name) {
    const cached = cache[name];
    if (cached && Date.now() - cached.loadedAt < cacheDuration) {
      return cached.data;
    }

    const response = await fetch('./data/' + name + '.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('Unable to load data/' + name + '.json (HTTP ' + response.status + ')');
    }

    const data = await response.json();
    cache[name] = { data: data, loadedAt: Date.now() };
    return data;
  }

  function activeFirebaseConfig() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const useEmulator = isLocal && new URLSearchParams(window.location.search).get('emulator') === '1';
    const config = useEmulator ? window.FIREBASE_EMULATOR_CONFIG : window.FIREBASE_CONFIG;
    if (!config || !config.projectId || !config.apiKey) return null;
    return config;
  }

  function firestoreValue(value) {
    if (!value || typeof value !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
    if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
    if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return Boolean(value.booleanValue);
    if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
    if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
    if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
    if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
      return (value.arrayValue.values || []).map(firestoreValue);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
      return firestoreFields(value.mapValue.fields || {});
    }
    return null;
  }

  function firestoreFields(fields) {
    const output = {};
    Object.keys(fields || {}).forEach(function (key) {
      output[key] = firestoreValue(fields[key]);
    });
    return output;
  }

  function normaliseRemoteEntry(data, fallbackSlug) {
    if (!data || typeof data !== 'object') return null;
    const entry = Object.assign({}, data);
    entry.slug = String(entry.slug || fallbackSlug || '').trim();
    entry.title = String(entry.title || '').trim();
    entry.status = String(entry.status || 'published').toLowerCase();
    entry.blocks = Array.isArray(entry.blocks) ? entry.blocks : [];
    entry.tags = Array.isArray(entry.tags) ? entry.tags : [];
    if (!entry.slug || !entry.title || entry.status !== 'published') return null;
    return entry;
  }

  async function remoteJournalEntries() {
    const config = activeFirebaseConfig();
    if (!config) return [];

    if (remoteCache && Date.now() - remoteCache.loadedAt < remoteCacheDuration) {
      return remoteCache.entries;
    }

    const emulator = Boolean(config.useEmulator);
    const origin = emulator ? 'http://127.0.0.1:8081' : 'https://firestore.googleapis.com';
    const path = '/v1/projects/' + encodeURIComponent(config.projectId) +
      '/databases/(default)/documents:runQuery';
    const key = emulator ? '' : '?key=' + encodeURIComponent(config.apiKey);
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'journal_posts' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'published' }
          }
        }
      }
    };

    try {
      const response = await fetch(origin + path + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });
      if (!response.ok) throw new Error('Firestore returned HTTP ' + response.status);

      const rows = await response.json();
      const entries = (Array.isArray(rows) ? rows : []).map(function (row) {
        if (!row || !row.document) return null;
        const name = String(row.document.name || '');
        const fallbackSlug = name.split('/').pop();
        return normaliseRemoteEntry(firestoreFields(row.document.fields || {}), fallbackSlug);
      }).filter(Boolean);

      remoteCache = { entries: entries, loadedAt: Date.now() };
      return entries;
    } catch (error) {
      // A configured but unreachable backend must not take down the static journal.
      console.warn('[ContentStore] Published posts are unavailable; using the static journal.', error);
      remoteCache = { entries: [], loadedAt: Date.now() };
      return [];
    }
  }

  async function getJournal() {
    const local = await get('journal');
    const remote = await remoteJournalEntries();
    if (!remote.length) return local;

    const entries = (local.entries || []).slice();
    const index = new Map(entries.map(function (entry) { return [entry.slug, entry]; }));
    remote.forEach(function (entry) {
      if (entry && entry.slug) index.set(entry.slug, entry);
    });

    return Object.assign({}, local, { entries: Array.from(index.values()) });
  }

  return {
    getJournal: getJournal,
    getSkills: function () { return get('skills'); },
    getTimeline: function () { return get('timeline'); },
    getHome: function () { return get('home'); },
  };
})();
