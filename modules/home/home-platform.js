/**
 * AARUTHRUN PORTFOLIO — HOMEPAGE PLATFORM SECTIONS
 * Bench, selected work, journal teaser and skills index are rendered from
 * data files so the homepage stays curated without becoming hardcoded.
 */

const HomePlatform = (function () {
  'use strict';

  const esc = ContentBlocks.esc;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmt(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    if (!parts[1]) return parts[0];
    return MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
  }

  function placeholder(text) {
    return '<span class="placeholder-inline">' + esc(text) + '</span>';
  }

  /**
   * Rows are injected after the page itself has already revealed, so each list
   * gets its own entrance: every row rises in on a short stagger.
   */
  function staggerRows(container) {
    if (!container) return;
    const rows = container.querySelectorAll('.bench-entry, .work-row, .home-note, .home-skill-row');
    if (!rows.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.add('stagger-item');
      rows[i].style.setProperty('--stagger-index', String(i));
    }

    // Flip to the settled state on the next beat so the transition runs.
    window.setTimeout(function () { container.classList.add('stagger-in'); }, 40);
  }

  function renderBench(projects) {
    // "Currently on the bench" is the archive's own state, newest update
    // first. It used to read a separate hand-maintained flag in home.json,
    // which could disagree with the project it was describing.
    const active = projects
      .filter(function (project) {
        return String(project.status || '').toLowerCase() === 'active';
      })
      .sort(function (a, b) {
        return String(b.updated || b.start || '').localeCompare(String(a.updated || a.start || ''));
      });

    if (!active.length) {
      return '<div class="platform-empty"><p>No project is marked active in the archive yet.</p><a href="projects.html">Browse all projects &rarr;</a></div>';
    }

    return '<div class="bench-list">' + active.map(function (project, index) {
      return (
        '<article class="bench-entry">' +
        '<a class="bench-thumb" href="project-' + esc(project.slug) + '.html" tabindex="-1" aria-hidden="true">' +
        '<img src="' + ContentBlocks.safeUrl(project.thumbImage || project.image) + '" alt="" loading="lazy" decoding="async">' +
        '</a>' +
        '<div class="bench-copy">' +
        '<div class="bench-topline"><span class="status-chip ' + esc(String(project.status).toLowerCase()) + '"><span class="status-dot"></span>' + esc(String(project.status).toUpperCase()) + '</span>' +
        '<span class="bench-updated">Updated ' + (project.updated ? fmt(project.updated) : placeholder('not recorded')) + '</span></div>' +
        '<h3><a href="project-' + esc(project.slug) + '.html">' + esc(project.shortTitle || project.title) + '</a></h3>' +
        '<p>' + esc(project.summary) + '</p>' +
        // The placeholder marks this one field as unrecorded. "Not documented
        // yet" read as a claim about the whole page, which contradicted the
        // documentation link directly beneath it.
        '<div class="bench-focus"><span>Current focus</span>' + (project.currentFocus ? esc(project.currentFocus) : placeholder('not recorded')) + '</div>' +
        '<a class="bench-link" href="project-' + esc(project.slug) + '.html">Open documentation &rarr;</a>' +
        '</div></article>'
      );
    }).join('') + '</div>';
  }

  function renderSelected(projects, home) {
    const picks = ((home && home.selected) || []).map(function (pick) {
      const project = projects.find(function (candidate) { return candidate.slug === pick.slug; });
      return project ? { project: project, image: pick.image || project.image } : null;
    }).filter(Boolean);

    if (!picks.length) {
      return '<div class="platform-empty"><p>The selected work list is not configured yet.</p><a href="projects.html">Browse the archive &rarr;</a></div>';
    }

    return '<div class="work-list">' + picks.map(function (pick, index) {
      const project = pick.project;
      const specs = project.specs ? Object.keys(project.specs).slice(0, 3) : [];
      return (
        '<article class="work-row' + (index % 2 ? ' is-reverse' : '') + '">' +
        '<a class="work-media" href="project-' + esc(project.slug) + '.html">' +
        '<img src="' + ContentBlocks.safeUrl(pick.image) + '" alt="' + esc(project.title) + '" loading="lazy" decoding="async">' +
        '<span class="work-count">' + String(index + 1).padStart(2, '0') + ' / ' + String(picks.length).padStart(2, '0') + '</span>' +
        '</a>' +
        '<div class="work-copy">' +
        '<div class="work-kicker">' + esc(project.category || 'Project') + ' · ' + fmt(project.start) + ' — ' + (project.end ? fmt(project.end) : 'Present') + '</div>' +
        '<h3><a href="project-' + esc(project.slug) + '.html">' + esc(project.title) + '</a></h3>' +
        '<p>' + esc(project.summary) + '</p>' +
        (specs.length ? '<dl class="work-specs">' + specs.map(function (key) {
          return '<div><dt>' + esc(key) + '</dt><dd>' + esc(project.specs[key]) + '</dd></div>';
        }).join('') + '</dl>' : '') +
        '<div class="work-foot"><div class="tag-list">' + (project.tags || []).slice(0, 4).map(function (tag) {
          return '<span class="tag">' + esc(tag) + '</span>';
        }).join('') + '</div><a class="work-link" href="project-' + esc(project.slug) + '.html">Full documentation &rarr;</a></div>' +
        '</div></article>'
      );
    }).join('') + '</div>';
  }

  function renderJournal(entries, projects) {
    const list = (entries || []).filter(function (entry) {
      return entry && entry.slug && entry.title && !entry.template && entry.status === 'published';
    }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, 3);

    if (!list.length) {
      return '<div class="platform-empty platform-empty-journal">' +
        '<div><span class="mono">Journal · 0 entries</span><p>The first field notes are being written — build logs, measurements and the parts that failed first.</p></div>' +
        '<a href="journal.html">Open the journal &rarr;</a></div>';
    }

    return '<div class="home-journal">' + list.map(function (entry) {
      const project = entry.project ? projects.find(function (candidate) { return candidate.slug === entry.project; }) : null;
      return '<a class="home-note" href="journal-' + encodeURIComponent(entry.slug) + '.html">' +
        '<span class="home-note-date">' + (entry.date ? fmt(entry.date) : 'Date not recorded') + '</span>' +
        '<div><span class="home-note-kicker">' + esc(entry.category || 'Field note') + (project ? ' · ' + esc(project.shortTitle || project.title) : '') + '</span>' +
        '<h3>' + esc(entry.title) + '</h3><p>' + esc(entry.summary || '') + '</p></div>' +
        '<span class="home-note-arrow" aria-hidden="true">&rarr;</span></a>';
    }).join('') + '</div>';
  }

  function renderSkills(skills) {
    const categories = (skills && skills.categories) || [];
    if (!categories.length) return '<div class="platform-empty"><p>The skills index is empty.</p></div>';
    return '<div class="home-skills">' + categories.map(function (category, index) {
      const names = (category.items || []).map(function (item) { return item.name; });
      const linked = (category.items || []).reduce(function (sum, item) { return sum + (item.projects || []).length; }, 0);
      return '<a class="home-skill-row" href="skills.html#' + esc(category.id) + '">' +
        '<span class="home-skill-num">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<div><h3>' + esc(category.title) + '</h3><p>' + esc(names.join(' · ')) + '</p></div>' +
        '<span class="home-skill-count">' + (linked ? linked + ' project links' : 'not linked yet') + '</span>' +
        '<span class="home-skill-arrow" aria-hidden="true">&rarr;</span></a>';
    }).join('') + '</div>';
  }

  async function init() {
    const bench = document.getElementById('bench-now-list');
    const selected = document.getElementById('selected-work');
    const journal = document.getElementById('home-journal');
    const skills = document.getElementById('home-skills');
    if (!bench && !selected && !journal && !skills) return;

    try {
      const results = await Promise.all([
        DataStore.getProjects(),
        ContentStore.getHome(),
        ContentStore.getJournal(),
        ContentStore.getSkills()
      ]);
      const projects = results[0];
      const home = results[1];
      const entries = (results[2] && results[2].entries) || [];
      const skillData = results[3];

      if (bench) bench.innerHTML = renderBench(projects);
      if (selected) selected.innerHTML = renderSelected(projects, home || {});
      if (journal) journal.innerHTML = renderJournal(entries, projects);
      if (skills) skills.innerHTML = renderSkills(skillData);

      staggerRows(bench);
      staggerRows(selected);
      staggerRows(journal);
      staggerRows(skills);
    } catch (error) {
      console.error('[HomePlatform] Unable to load structured content:', error);
      const target = bench || selected || journal || skills;
      if (target) target.innerHTML = '<p class="mono text-muted">Unable to load this section. Check the data files.</p>';
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return { init: init };
})();
