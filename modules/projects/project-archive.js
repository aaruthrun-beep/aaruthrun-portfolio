/**
 * AARUTHRUN PORTFOLIO — PROJECT ARCHIVE HIERARCHY
 * Featured projects get large alternating editorial rows with technical
 * annotations. Everything else is a compact listing. Ranking comes from
 * featuredRank in projects.json; no engineering content is inferred.
 */

const ProjectArchive = (function () {
  'use strict';

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function dateRange(project) {
    function one(value, fallback) {
      if (!value) return fallback;
      const parts = String(value).split('-');
      if (parts.length < 2) return parts[0];
      return (MONTHS[Number(parts[1]) - 1] || parts[1]) + ' ' + parts[0];
    }
    return one(project.start, 'DATE NOT RECORDED') + ' — ' + one(project.end, 'PRESENT');
  }

  function statusClass(status) {
    return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function statusChip(project) {
    if (!project.status) return '<span class="archive-status-empty">STATUS NOT RECORDED</span>';
    return '<span class="status-chip ' + esc(statusClass(project.status)) + '"><span class="status-dot"></span>' +
      esc(String(project.status).toUpperCase()) + '</span>';
  }

  function tagList(tags) {
    return '<div class="tag-list">' + (tags || []).map(function (tag) {
      return '<span class="tag">' + esc(tag) + '</span>';
    }).join('') + '</div>';
  }

  function renderFeatured(project, index, total) {
    const specs = Object.keys(project.specs || {}).slice(0, 4);
    const isLead = index < 2;

    return (
      '<article class="archive-feature' + (index % 2 ? ' is-reverse' : '') + (isLead ? ' is-lead' : '') + '">' +
      '<a class="archive-feature-media" href="project-' + esc(project.slug) + '.html" tabindex="-1" aria-hidden="true">' +
      '<img src="' + esc(project.archiveImage || project.image) + '" alt="" ' + (index === 0 ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"') + '>' +
      '<span class="archive-feature-index">' + String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + '</span>' +
      '</a>' +
      '<div class="archive-feature-copy">' +
      '<div class="archive-feature-kicker"><span>' + esc(project.category || 'Project') + '</span><span>' + esc(dateRange(project)) + '</span></div>' +
      '<h2><a href="project-' + esc(project.slug) + '.html">' + esc(project.title) + '</a></h2>' +
      '<p class="archive-feature-summary">' + esc(project.summary) + '</p>' +
      (project.problem ? '<p class="archive-feature-problem">' + esc(project.problem) + '</p>' : '') +
      (specs.length ? '<dl class="archive-specs">' + specs.map(function (key) {
        return '<div><dt>' + esc(key) + '</dt><dd>' + esc(project.specs[key]) + '</dd></div>';
      }).join('') + '</dl>' : '') +
      '<div class="archive-feature-foot">' +
      tagList(project.tags) +
      statusChip(project) +
      '</div>' +
      '<a class="archive-feature-link" href="project-' + esc(project.slug) + '.html">Full documentation &rarr;</a>' +
      '</div></article>'
    );
  }

  function renderCompact(project) {
    return (
      '<a class="archive-mini" href="project-' + esc(project.slug) + '.html">' +
      '<div class="archive-mini-media"><img src="' + esc(project.thumbImage || project.archiveImage || project.image) + '" alt="' + esc(project.title) + '" loading="lazy" decoding="async"></div>' +
      '<div class="archive-mini-body">' +
      '<div class="archive-mini-meta"><span>' + esc(dateRange(project)) + '</span>' + statusChip(project) + '</div>' +
      '<h3>' + esc(project.shortTitle || project.title) + '</h3>' +
      '<p>' + esc(project.summary) + '</p>' +
      (project.monoSpec ? '<div class="archive-mini-spec" title="' + esc(project.monoSpec) + '">' + esc(project.monoSpec) + '</div>' : '') +
      tagList((project.tags || []).slice(0, 4)) +
      '</div></a>'
    );
  }

  function groupHead(index, kicker, title, count, id) {
    return (
      '<div class="archive-group-head">' +
      '<div><span class="archive-group-index">' + index + ' / ' + kicker + '</span>' +
      '<h2 id="' + id + '">' + title + '</h2></div>' +
      '<span class="archive-group-count">' + String(count).padStart(2, '0') + ' PROJECT' + (count === 1 ? '' : 'S') + '</span>' +
      '</div>'
    );
  }

  function render(gridEl, projects) {
    if (!gridEl) return;

    if (!projects || !projects.length) {
      gridEl.innerHTML =
        '<div class="archive-empty">' +
        '<div class="mono text-muted">NO PROJECTS MATCH SELECTED FILTERS</div>' +
        '<p>Try a different domain or status.</p>' +
        '<button class="btn btn-sm btn-mono btn-secondary" id="btn-reset-filters">RESET FILTERS</button>' +
        '</div>';
      const resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) resetBtn.addEventListener('click', function () {
        document.dispatchEvent(new CustomEvent('portfolio:filter-reset'));
      });
      return;
    }

    const featured = projects
      .filter(function (project) { return Number.isFinite(Number(project.featuredRank)); })
      .sort(function (a, b) { return Number(a.featuredRank) - Number(b.featuredRank); });
    const others = projects.filter(function (project) { return !Number.isFinite(Number(project.featuredRank)); });

    let html = '';

    if (featured.length) {
      html += '<section class="archive-group archive-group-featured" aria-labelledby="featured-group-title">' +
        groupHead('01', 'FEATURED ENGINEERING', 'Featured engineering projects', featured.length, 'featured-group-title') +
        '<div class="archive-feature-list">' +
        featured.map(function (project, index) { return renderFeatured(project, index, featured.length); }).join('') +
        '</div></section>';
    }

    if (others.length) {
      html += '<section class="archive-group archive-group-other" aria-labelledby="other-group-title">' +
        groupHead('02', 'ARCHIVE', 'Other projects', others.length, 'other-group-title') +
        '<div class="archive-compact-grid">' +
        others.map(renderCompact).join('') +
        '</div></section>';
    }

    gridEl.innerHTML = html;
    document.dispatchEvent(new CustomEvent('portfolio:updated'));
  }

  return { render: render };
})();
