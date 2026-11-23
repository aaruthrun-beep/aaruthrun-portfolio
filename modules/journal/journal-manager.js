/**
 * AARUTHRUN PORTFOLIO — FIELD NOTES
 * Renders the engineering journal index and article pages from data/journal.json.
 * Entries are structured blocks rendered by ContentBlocks. Only entries with a
 * slug, title and published status are exposed; drafts never reach the DOM.
 */

const JournalManager = (function () {
  'use strict';

  const esc = ContentBlocks.esc;
  const safeUrlValue = ContentBlocks.safeUrlValue;
  const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const PAGE_SIZE = 4;
  const PROJECT_ALIASES = {
    'v-plotter': 'V-Plotter',
    'itms': 'ITMS',
    'agri-robotics': 'Agri-Robotics'
  };

  const TEMPLATE = {
    template: true,
    slug: 'entry-template',
    title: 'Entry template — how a field note is laid out',
    summary: 'This is a layout preview, not a published engineering note. It shows every content block the journal supports: prose, headings, photographs, image pairs, code, tables, callouts and references.',
    date: null,
    category: 'Template',
    project: null,
    tags: ['Template'],
    blocks: [
      { type: 'paragraph', text: 'Start with the context: what you were building, what problem you were working on, and the state of the machine when you began. This paragraph is a placeholder.' },
      { type: 'heading', level: 2, text: 'What was on the bench' },
      { type: 'paragraph', text: 'Describe the setup, the parts, the firmware version, and the test conditions. Keep the observations separate from the conclusions.' },
      { type: 'image', src: 'images/home/bench-nite.jpg', alt: 'Placeholder bench photograph', caption: 'Placeholder image — replace with a photograph of the actual build.' },
      { type: 'heading', level: 2, text: 'Attempt, measurement, result' },
      { type: 'paragraph', text: 'Paste the measurement that mattered and what changed between attempts. This block supports a pair of photographs side by side.' },
      { type: 'image-grid', images: [
        { src: 'images/home/bench-cat.jpg', alt: 'Placeholder detail photograph', caption: 'Placeholder — detail before the change.' },
        { src: 'images/home/bench-scrapx6.jpg', alt: 'Placeholder second photograph', caption: 'Placeholder — after the change.' }
      ] },
      { type: 'callout', title: 'Placeholder callout', text: 'Use callouts for a wiring note, a safety warning, or the one thing you would check first next time.' },
      { type: 'heading', level: 2, text: 'Firmware excerpt' },
      { type: 'code', filename: 'firmware/placeholder.c', language: 'c', code: '/* Replace this with the real excerpt. */\nwhile (1) {\n    // placeholder: control loop\n}' },
      { type: 'heading', level: 2, text: 'Measurements' },
      { type: 'table', caption: 'Placeholder table — replace the rows with recorded measurements, not estimates.', head: ['Parameter', 'Attempt 1', 'Attempt 2'], rows: [['Measured value', '—', '—'], ['Observation', 'placeholder', 'placeholder']] },
      { type: 'heading', level: 2, text: 'What carried over' },
      { type: 'list', ordered: false, items: ['Placeholder: the decision that worked.', 'Placeholder: the trade-off you accepted.', 'Placeholder: the next experiment.'] },
      { type: 'quote', text: 'A sentence from the build notes that is worth keeping.', attribution: 'Placeholder attribution' },
      { type: 'references', items: [{ label: 'Datasheet or reference title', url: '', note: 'add the link when available' }] }
    ]
  };

  function publishedEntries(entries) {
    return (entries || []).filter(function (entry) {
      return entry && entry.slug && entry.title && !entry.template && entry.status === 'published';
    }).sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function dateParts(value) {
    const parts = String(value || '').split('-');
    if (parts.length < 3) return null;
    return { year: parts[0], month: Number(parts[1]) - 1, day: Number(parts[2]) };
  }

  function fmtDate(value) {
    const parts = dateParts(value);
    if (!parts || !MONTHS_SHORT[parts.month]) return 'DATE NOT RECORDED';
    return String(parts.day).padStart(2, '0') + ' ' + MONTHS_SHORT[parts.month] + ' ' + parts.year;
  }

  function fmtDateLong(value) {
    const parts = dateParts(value);
    if (!parts || !MONTHS_LONG[parts.month]) return 'date not recorded';
    return parts.day + ' ' + MONTHS_LONG[parts.month] + ' ' + parts.year;
  }

  function isoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
  }

  function articleHref(entry) {
    return 'journal-' + encodeURIComponent(entry.slug) + '.html';
  }

  function projectFor(entry, projects) {
    if (!entry.project) return null;
    return (projects || []).find(function (candidate) {
      return candidate.slug === entry.project;
    }) || null;
  }

  function projectReference(entry, projects) {
    const project = projectFor(entry, projects);
    if (project) {
      return {
        name: project.shortTitle || project.title,
        href: 'project-' + encodeURIComponent(project.slug) + '.html',
        status: project.status || ''
      };
    }
    if (entry.projectLabel || PROJECT_ALIASES[entry.project]) {
      return {
        name: entry.projectLabel || PROJECT_ALIASES[entry.project],
        href: safeUrlValue(entry.projectUrl),
        status: ''
      };
    }
    return null;
  }

  function projectName(entry, projects) {
    const reference = projectReference(entry, projects);
    return reference ? reference.name : null;
  }

  function coverFor(entry, projects) {
    if (entry.cover) return entry.cover;
    const project = projectFor(entry, projects);
    return project ? project.archiveImage || project.image || '' : '';
  }

  function thumbFor(entry, projects) {
    if (entry.thumb) return entry.thumb;
    const project = projectFor(entry, projects);
    return project ? project.thumbImage || project.archiveImage || project.image || '' : coverFor(entry, projects);
  }

  function textForBlock(block) {
    if (!block || !block.type) return '';
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
        return block.text || '';
      case 'list':
        return (block.items || []).join(' ');
      case 'callout':
        return (block.title || '') + ' ' + (block.text || '');
      case 'table':
        return (block.head || []).join(' ') + ' ' + (block.rows || []).map(function (row) {
          const cells = Array.isArray(row) ? row : (row.cells || []);
          return cells.join(' ');
        }).join(' ');
      case 'image':
        return (block.alt || '') + ' ' + (block.caption || '');
      case 'image-grid':
        return (block.images || []).map(textForBlock).join(' ');
      case 'references':
        return (block.items || []).map(function (item) { return (item.label || '') + ' ' + (item.note || ''); }).join(' ');
      default:
        return '';
    }
  }

  function readingMinutes(entry) {
    if (entry.readingTime) return Math.max(1, Number(entry.readingTime) || 1);
    const words = ((entry.subtitle || '') + ' ' + (entry.summary || '') + ' ' + (entry.blocks || []).map(textForBlock).join(' '))
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  function readingLabel(entry) {
    return readingMinutes(entry) + ' MIN READ';
  }

  function updateStats(entries) {
    const categories = [];
    (entries || []).forEach(function (entry) {
      if (entry.category && categories.indexOf(entry.category) === -1) categories.push(entry.category);
    });
    const totalEl = document.querySelector('[data-journal-stat="articles"]');
    const categoriesEl = document.querySelector('[data-journal-stat="categories"]');
    const latestEl = document.querySelector('[data-journal-stat="latest"]');
    if (totalEl) totalEl.textContent = String((entries || []).length).padStart(2, '0');
    if (categoriesEl) categoriesEl.textContent = String(categories.length).padStart(2, '0');
    if (latestEl) latestEl.textContent = entries && entries.length ? fmtDate(entries[0].date) : '—';
  }

  function renderEmpty(container) {
    container.innerHTML =
      '<div class="journal-empty">' +
      '<div class="journal-empty-kicker">Field Notes · no entries published yet</div>' +
      '<h2>The first field notes are being written.</h2>' +
      '<p>Build logs, measurements and failed attempts will live here. The archive is ready; the writing comes next.</p>' +
      '<div class="journal-empty-actions">' +
      '<a class="btn btn-secondary btn-mono" href="journal-entry.html?template=1">View the entry template</a>' +
      '<a class="btn btn-ghost btn-mono" href="timeline.html">Browse the timeline</a>' +
      '</div></div>';
  }

  function renderFeatured(entry, projects) {
    const cover = safeUrlValue(coverFor(entry, projects));
    const reference = projectReference(entry, projects);
    const id = 'featured-' + entry.slug;
    return (
      '<article class="fn-featured" aria-labelledby="' + esc(id) + '">' +
        (cover
          ? '<a class="fn-featured-media" href="' + esc(articleHref(entry)) + '" tabindex="-1" aria-hidden="true">' +
              '<img src="' + esc(cover) + '" alt="' + esc(entry.coverAlt || entry.title) + '" loading="eager" decoding="async">' +
              '<span class="fn-media-corner">FEATURED / ' + esc(fmtDate(entry.date)) + '</span>' +
            '</a>'
          : '') +
        '<div class="fn-featured-copy">' +
          '<div class="fn-label-row"><span class="fn-label">Featured field note</span><span class="fn-label">' + esc(entry.category || 'Field note') + '</span></div>' +
          '<h2 id="' + esc(id) + '"><a href="' + esc(articleHref(entry)) + '">' + esc(entry.title) + '</a></h2>' +
          '<p class="fn-featured-deck">' + esc(entry.summary || '') + '</p>' +
          '<div class="fn-featured-meta">' +
            '<time datetime="' + esc(isoDate(entry.date)) + '">' + esc(fmtDate(entry.date)) + '</time>' +
            '<span>' + esc(readingLabel(entry)) + '</span>' +
            (reference ? '<span>' + esc(reference.name) + '</span>' : '') +
          '</div>' +
          '<a class="fn-text-link" href="' + esc(articleHref(entry)) + '">Read the field note <span aria-hidden="true">&rarr;</span></a>' +
        '</div>' +
      '</article>'
    );
  }

  function renderEntryRow(entry, projects, index) {
    const reference = projectReference(entry, projects);
    const thumb = safeUrlValue(thumbFor(entry, projects));
    return (
      '<a class="fn-row" href="' + esc(articleHref(entry)) + '">' +
        '<div class="fn-row-date">' +
          '<time datetime="' + esc(isoDate(entry.date)) + '">' + esc(fmtDate(entry.date)) + '</time>' +
          '<span class="fn-row-index">' + String(index + 1).padStart(2, '0') + '</span>' +
        '</div>' +
        '<div class="fn-row-copy">' +
          '<div class="fn-row-kicker"><span>' + esc(entry.category || 'Field note') + '</span>' +
            (reference ? '<span class="fn-row-project">' + esc(reference.name) + '</span>' : '') +
          '</div>' +
          '<h3>' + esc(entry.title) + '</h3>' +
          '<p>' + esc(entry.summary || '') + '</p>' +
          '<div class="fn-row-foot"><span>' + esc(readingLabel(entry)) + '</span><span class="fn-row-read">Read note <span aria-hidden="true">&rarr;</span></span></div>' +
        '</div>' +
        (thumb
          ? '<figure class="fn-row-media"><img src="' + esc(thumb) + '" alt="' + esc(entry.coverAlt || entry.title) + '" loading="lazy" decoding="async"></figure>'
          : '') +
      '</a>'
    );
  }

  function renderToolbar(categories) {
    return (
      '<div class="fn-toolbar">' +
        '<div class="fn-filter-block">' +
          '<span class="fn-label">Filter by category</span>' +
          '<div class="fn-chips" role="group" aria-label="Filter field notes by category">' +
            '<button class="fn-chip is-active" type="button" data-journal-category="*" aria-pressed="true">All notes</button>' +
            categories.map(function (category) {
              return '<button class="fn-chip" type="button" data-journal-category="' + esc(category) + '" aria-pressed="false">' + esc(category) + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<label class="fn-search" for="journal-search">' +
          '<span class="fn-label">Search the archive</span>' +
          '<input id="journal-search" type="search" placeholder="Title, description or tag" autocomplete="off">' +
        '</label>' +
      '</div>'
    );
  }

  function renderList(container, entries, projects) {
    const list = publishedEntries(entries);
    updateStats(list);

    if (!list.length) {
      renderEmpty(container);
      return;
    }

    const featured = list.find(function (entry) { return entry.featured; }) || list[0];
    const categories = [];
    list.forEach(function (entry) {
      if (entry.category && categories.indexOf(entry.category) === -1) categories.push(entry.category);
    });
    categories.sort();

    container.innerHTML =
      renderFeatured(featured, projects) +
      '<section class="fn-latest" aria-labelledby="fn-latest-title">' +
        '<div class="fn-section-head">' +
          '<div><span class="fn-label">Chronological archive</span><h2 id="fn-latest-title">Latest Field Notes</h2></div>' +
          '<p>Notes are ordered by publication date. Filter by discipline or search titles, descriptions and tags.</p>' +
        '</div>' +
        renderToolbar(categories) +
        '<p class="fn-result-count" id="fn-result-count" aria-live="polite"></p>' +
        '<div class="fn-rows" id="fn-rows"></div>' +
        '<div class="fn-more-wrap" id="fn-more-wrap"></div>' +
      '</section>';

    const rowsEl = container.querySelector('#fn-rows');
    const countEl = container.querySelector('#fn-result-count');
    const moreEl = container.querySelector('#fn-more-wrap');
    const searchEl = container.querySelector('#journal-search');
    const categoryButtons = Array.prototype.slice.call(container.querySelectorAll('[data-journal-category]'));
    let category = '*';
    let query = '';
    let limit = PAGE_SIZE;

    function searching() {
      return category !== '*' || query.trim() !== '';
    }

    function results() {
      const term = query.trim().toLowerCase();
      const pool = searching() ? list : list.filter(function (entry) { return entry.slug !== featured.slug; });
      return pool.filter(function (entry) {
        const categoryMatch = category === '*' || entry.category === category;
        if (!categoryMatch) return false;
        if (!term) return true;
        const haystack = [
          entry.title,
          entry.subtitle,
          entry.summary,
          entry.category,
          (entry.tags || []).join(' '),
          projectName(entry, projects) || ''
        ].join(' ').toLowerCase();
        return haystack.indexOf(term) !== -1;
      });
    }

    function paint() {
      const matched = results();
      const visible = matched.slice(0, limit);
      rowsEl.innerHTML = visible.length
        ? visible.map(function (entry, index) { return renderEntryRow(entry, projects, index); }).join('')
        : '<div class="fn-no-results"><p class="fn-label">No matching notes</p><p>Nothing in the archive matches that filter and search.</p><button class="fn-clear" type="button">Clear filters</button></div>';

      if (searching()) {
        countEl.textContent = matched.length + ' ' + (matched.length === 1 ? 'note matches' : 'notes match') + ' the current filter.';
      } else if (visible.length === matched.length) {
        countEl.textContent = 'Showing all ' + matched.length + ' more notes.';
      } else {
        countEl.textContent = 'Showing ' + visible.length + ' of ' + matched.length + ' more notes.';
      }

      if (matched.length > limit) {
        moreEl.innerHTML = '<button class="fn-load-more" type="button">Load older notes <span aria-hidden="true">&darr;</span></button>';
        moreEl.querySelector('button').addEventListener('click', function () {
          limit += PAGE_SIZE;
          paint();
        });
      } else {
        moreEl.innerHTML = '';
      }

      const clear = rowsEl.querySelector('.fn-clear');
      if (clear) {
        clear.addEventListener('click', function () {
          category = '*';
          query = '';
          limit = PAGE_SIZE;
          searchEl.value = '';
          categoryButtons.forEach(function (button) {
            const active = button.getAttribute('data-journal-category') === '*';
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
          });
          paint();
        });
      }
    }

    categoryButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        category = button.getAttribute('data-journal-category');
        limit = PAGE_SIZE;
        categoryButtons.forEach(function (other) {
          const active = other === button;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });
        paint();
      });
    });

    searchEl.addEventListener('input', function () {
      query = searchEl.value;
      limit = PAGE_SIZE;
      paint();
    });

    paint();
  }

  function slugifyHeading(text, used) {
    let base = String(text || 'section')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'section';
    let id = base;
    let suffix = 2;
    while (used[id]) {
      id = base + '-' + suffix;
      suffix += 1;
    }
    used[id] = true;
    return id;
  }

  function prepareBlocks(blocks) {
    const used = {};
    return (blocks || []).map(function (block) {
      if (!block || block.type !== 'heading') return block;
      return Object.assign({}, block, { id: slugifyHeading(block.text, used) });
    });
  }

  function buildToc(blocks) {
    const headings = (blocks || []).filter(function (block) {
      return block && block.type === 'heading' && block.level >= 2 && block.level <= 3;
    });
    if (headings.length < 2) return '';
    return headings.map(function (heading) {
      return '<a class="fn-toc-link' + (Number(heading.level) === 3 ? ' is-sub' : '') + '" href="#' + esc(heading.id) + '">' + esc(heading.text) + '</a>';
    }).join('');
  }

  function renderProjectCard(entry, projects) {
    const reference = projectReference(entry, projects);
    if (!reference) return '';
    const meta = reference.href
      ? (reference.status ? esc(reference.status) + ' · ' : '') + 'View documentation &rarr;'
      : (reference.status || 'Project reference');
    const body =
      '<span class="fn-label">Related project</span>' +
      '<span class="entry-project-title">' + esc(reference.name) + '</span>' +
      '<span class="entry-project-meta">' + meta + '</span>';
    return reference.href
      ? '<a class="entry-project-card" href="' + esc(reference.href) + '">' + body + '</a>'
      : '<div class="entry-project-card is-static">' + body + '</div>';
  }

  function relatedEntries(entry, list) {
    const scored = list.filter(function (candidate) { return candidate.slug !== entry.slug; }).map(function (candidate) {
      let score = 0;
      if (candidate.category === entry.category) score += 3;
      if (candidate.project && candidate.project === entry.project) score += 3;
      (candidate.tags || []).forEach(function (tag) {
        if ((entry.tags || []).indexOf(tag) !== -1) score += 1;
      });
      return { entry: candidate, score: score };
    }).filter(function (item) { return item.score > 0; });

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.entry.date || '').localeCompare(String(a.entry.date || ''));
    });

    const picked = scored.slice(0, 2).map(function (item) { return item.entry; });
    if (picked.length < 2) {
      list.forEach(function (candidate) {
        if (picked.length >= 2) return;
        if (candidate.slug === entry.slug) return;
        if (picked.some(function (item) { return item.slug === candidate.slug; })) return;
        picked.push(candidate);
      });
    }
    return picked;
  }

  function renderRelated(entry, list) {
    const related = relatedEntries(entry, list);
    if (!related.length) return '';
    return (
      '<section class="fn-related" aria-labelledby="fn-related-title">' +
        '<div class="fn-section-head is-compact"><div><span class="fn-label">Continue reading</span><h2 id="fn-related-title">Related field notes</h2></div></div>' +
        '<div class="fn-related-grid">' +
          related.map(function (item) {
            return '<a class="fn-related-card" href="' + esc(articleHref(item)) + '">' +
              '<span class="fn-related-meta">' + esc(fmtDate(item.date)) + ' / ' + esc(item.category || 'Field note') + '</span>' +
              '<h3>' + esc(item.title) + '</h3>' +
              '<span class="fn-related-read">' + esc(readingLabel(item)) + ' <span aria-hidden="true">&rarr;</span></span>' +
            '</a>';
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

  function setupToc(container) {
    container.querySelectorAll('.fn-toc-link').forEach(function (link) {
      link.addEventListener('click', function (event) {
        const id = (link.getAttribute('href') || '').replace(/^#/, '');
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        event.preventDefault();
        const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 56;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 22;
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        window.history.pushState(null, '', '#' + id);
        root.style.scrollBehavior = 'auto';
        document.scrollingElement.scrollTop = top;
        window.requestAnimationFrame(function () {
          root.style.scrollBehavior = previousBehavior;
        });
      });
    });
  }

  // SVG covers do not render in link previews; use a photograph instead.
  function previewImage(entry, projects) {
    if (/\.(jpe?g|png|webp|gif|avif)$/i.test(entry.cover || '')) return entry.cover;
    const project = projectFor(entry, projects);
    if (project) return project.archiveImage || project.image || '';
    return 'images/og-image.jpg';
  }

  function setMeta(selector, attribute, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute(attribute, value);
  }

  function applyArticleMeta(entry, projects) {
    if (entry.template) {
      document.title = 'Entry template — Field Notes';
      return;
    }
    // A prerendered note already ships its final metadata; rewriting it in
    // the browser would only be a step backwards.
    if (document.body.dataset.page === 'journal') return;

    document.title = entry.title + ' — Field Notes';
    const description = entry.summary || entry.subtitle || '';
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', entry.title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[property="og:image"]', 'content', new URL(safeUrlValue(previewImage(entry, projects)), window.location.href).href);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', new URL(articleHref(entry), window.location.href).href);
  }

  async function renderEntry(container, entries, projects) {
    const params = new URLSearchParams(window.location.search);
    const isTemplate = params.get('template') === '1';
    // A prerendered note (tools/build-pages.mjs) carries its slug on the body.
    const slug = document.body.dataset.slug || params.get('slug');
    const list = publishedEntries(entries);
    let entry = null;

    if (isTemplate) {
      entry = TEMPLATE;
    } else if (slug) {
      entry = list.find(function (candidate) { return candidate.slug === slug; }) || null;
    }

    if (!entry) {
      document.title = 'Field note not found — Field Notes';
      container.innerHTML =
        '<div class="journal-empty"><div class="journal-empty-kicker">Field Notes · entry not found</div>' +
        '<h2>That note is not published yet.</h2>' +
        '<p>The address may have changed, or the entry is still a draft.</p>' +
        '<div class="journal-empty-actions"><a class="btn btn-secondary btn-mono" href="journal.html">Back to Field Notes</a></div></div>';
      return;
    }

    applyArticleMeta(entry, projects);
    const index = list.findIndex(function (candidate) { return candidate.slug === entry.slug; });
    const newer = index > 0 ? list[index - 1] : null;
    const older = index > -1 && index < list.length - 1 ? list[index + 1] : null;
    const reference = projectReference(entry, projects);
    const cover = safeUrlValue(coverFor(entry, projects));
    const preparedBlocks = prepareBlocks(entry.blocks);
    const toc = buildToc(preparedBlocks);

    container.innerHTML =
      (entry.template ? '<div class="template-banner"><strong>Template preview.</strong> This is not a published entry. It shows the layout available for a field note.</div>' : '') +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="journal.html">Field Notes</a><span>/</span><span aria-current="page">' + esc(entry.title) + '</span></nav>' +
      '<header class="fn-article-head">' +
        '<div class="fn-article-kicker"><span>' + esc(entry.category || 'Field note') + '</span><span>' + esc(fmtDate(entry.date)) + '</span></div>' +
        '<h1>' + esc(entry.title) + '</h1>' +
        '<p class="fn-article-deck">' + esc(entry.subtitle || entry.summary || '') + '</p>' +
        '<div class="fn-byline">' +
          '<div><span class="fn-label">Written by</span><span>' + esc(entry.author || 'Aaruthrun') + '</span></div>' +
          '<div><span class="fn-label">Published</span><time datetime="' + esc(isoDate(entry.date)) + '">' + esc(fmtDate(entry.date)) + '</time></div>' +
          '<div><span class="fn-label">Reading time</span><span>' + esc(readingLabel(entry)) + '</span></div>' +
          (reference ? '<div><span class="fn-label">Project</span>' + (reference.href ? '<a href="' + esc(reference.href) + '">' + esc(reference.name) + '</a>' : '<span>' + esc(reference.name) + '</span>') + '</div>' : '') +
        '</div>' +
        (cover
          ? '<figure class="fn-article-cover"><img src="' + esc(cover) + '" alt="' + esc(entry.coverAlt || entry.title) + '" decoding="async">' +
              (entry.coverCaption ? '<figcaption>' + esc(entry.coverCaption) + '</figcaption>' : '') +
            '</figure>'
          : '') +
      '</header>' +
      '<div class="fn-article-layout' + (toc ? '' : ' is-single') + '">' +
        (toc
          ? '<aside class="fn-toc" aria-label="Table of contents"><div class="fn-toc-inner">' +
              '<span class="fn-label">Contents</span>' +
              '<nav>' + toc + '</nav>' +
              '<a class="fn-toc-back" href="journal.html">Field Notes index &rarr;</a>' +
            '</div></aside>'
          : '') +
        '<div class="entry-body fn-prose">' + ContentBlocks.render(preparedBlocks) + '</div>' +
      '</div>' +
      '<footer class="fn-article-foot">' +
        '<div class="fn-foot-tags">' +
          '<span class="fn-label">Filed under</span>' +
          '<div class="entry-tags">' + (entry.tags || []).map(function (tag) { return '<span class="tag">' + esc(tag) + '</span>'; }).join('') + '</div>' +
        '</div>' +
        (reference ? renderProjectCard(entry, projects) : '') +
        '<div class="entry-sharing"><span class="fn-label">Cite this note</span><span class="entry-cite">Aaruthrun, “' + esc(entry.title) + '”, Field Notes, ' + esc(fmtDateLong(entry.date)) + '.</span></div>' +
      '</footer>' +
      renderRelated(entry, list) +
      ((newer || older) ? '<nav class="entry-pager" aria-label="Field note navigation">' +
        (newer ? '<a href="' + esc(articleHref(newer)) + '"><span>Newer field note</span>' + esc(newer.title) + '</a>' : '<span></span>') +
        (older ? '<a class="is-next" href="' + esc(articleHref(older)) + '"><span>Older field note</span>' + esc(older.title) + '</a>' : '') +
        '</nav>' : '') +
      '<div class="fn-back-row"><a class="fn-text-link" href="journal.html"><span aria-hidden="true">&larr;</span> Back to Field Notes</a></div>';

    setupToc(container);
  }

  async function init() {
    const listEl = document.getElementById('journal-app');
    const entryEl = document.getElementById('journal-entry');
    if (!listEl && !entryEl) return;

    try {
      const results = await Promise.all([ContentStore.getJournal(), DataStore.getProjects()]);
      const journal = results[0];
      const projects = results[1];
      if (listEl) renderList(listEl, journal.entries || [], projects);
      if (entryEl) await renderEntry(entryEl, journal.entries || [], projects);
    } catch (error) {
      console.error('[Journal] Unable to load content:', error);
      const target = listEl || entryEl;
      if (target) target.innerHTML = '<p class="mono text-muted">Unable to load Field Notes. Check data/journal.json.</p>';
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return { init: init };
})();
