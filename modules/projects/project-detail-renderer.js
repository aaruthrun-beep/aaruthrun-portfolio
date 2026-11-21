/**
 * AARUTHRUN PORTFOLIO — PROJECT DOCUMENTATION TEMPLATE
 * Renders the project detail page from projects.json. Sections without content
 * are hidden. Nothing is inferred: missing facts are labelled as not recorded.
 */

const ProjectDetail = (function () {
  'use strict';

  const esc = ContentBlocks.esc;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmt(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (!year) return esc(value);
    if (!month) return String(year);
    return MONTHS[month - 1] + ' ' + year;
  }

  function fmtFull(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    if (parts.length < 3) return fmt(value);
    return Number(parts[2]) + ' ' + MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
  }

  function statusClass(status) {
    return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function placeholder(text) {
    return '<span class="placeholder-inline">' + esc(text) + '</span>';
  }

  function safeExternal(url) {
    return /^https?:\/\//i.test(String(url || '')) ? ContentBlocks.safeUrl(url) : '';
  }

  function section(number, id, title, body) {
    if (!body) return '';
    return (
      '<section class="doc-section" id="' + id + '" aria-labelledby="' + id + '-title">' +
      '<div class="doc-num">' + number + '</div>' +
      '<div class="doc-content">' +
      '<h2 class="doc-title" id="' + id + '-title">' + esc(title) + '</h2>' +
      body +
      '</div></section>'
    );
  }

  function logItems(items, dateKey, titleKey, bodyKey, fallbackType) {
    return (items || []).map(function (item) {
      const date = dateKey === 'date' ? fmtFull(item.date) : '';
      return (
        '<div class="doc-log-item">' +
        '<div class="doc-log-date">' + (date ? esc(date) + ' // ' : '') + esc((item.type || fallbackType || '').toUpperCase()) + '</div>' +
        '<div class="doc-log-title">' + esc(item[titleKey] || '') + '</div>' +
        (item[bodyKey] ? '<div class="doc-log-body">' + esc(item[bodyKey]) + '</div>' : '') +
        '</div>'
      );
    }).join('');
  }

  function render(project, allProjects) {
    const projects = Array.isArray(allProjects) ? allProjects : [];
    const status = project.status || '';
    const statusLabel = status ? status.toUpperCase() : 'STATUS NOT RECORDED';
    const timeframe = (fmt(project.start) || 'Not recorded') + ' — ' + (fmt(project.end) || 'Present');
    const updated = project.updated ? fmtFull(project.updated) : placeholder('Not recorded yet');

    const architecture = [
      project.architecture ? '<div class="doc-sub"><h3>System architecture</h3><p>' + esc(project.architecture) + '</p></div>' : '',
      project.mechanical ? '<div class="doc-sub"><h3>Mechanical</h3><p>' + esc(project.mechanical) + '</p></div>' : '',
      project.electronicsFirmware ? '<div class="doc-sub"><h3>Electronics & firmware</h3><p>' + esc(project.electronicsFirmware) + '</p></div>' : '',
      project.control ? '<div class="doc-sub"><h3>Control & software</h3><p>' + esc(project.control) + '</p></div>' : ''
    ].join('');

    const milestones = logItems(project.milestones || [], 'date', 'label', 'description', 'Milestone');
    const buildLog = (project.buildLog || []).map(function (item) {
      return '<div class="doc-log-item">' +
        '<div class="doc-log-date">' + (item.date ? esc(fmtFull(item.date)) : 'Date not recorded') + '</div>' +
        '<div class="doc-log-body">' + esc(item.entry || '') + '</div>' +
        '</div>';
    }).join('');
    const images = (project.images || []).filter(Boolean);

    const media = images.length
      ? '<div class="doc-media-grid">' + images.map(function (src, index) {
          const set = ContentBlocks.srcset(src);
          return (
            '<a class="doc-media-item js-lightbox" href="' + ContentBlocks.safeUrl(src) + '"' +
            ' data-lightbox-group="' + esc(project.slug) + '"' +
            ' data-caption="' + esc(project.title + ' — image ' + (index + 1)) + '">' +
            '<img src="' + ContentBlocks.safeUrl(src) + '"' +
            (set ? ' srcset="' + set + '" sizes="(max-width: 700px) 92vw, 420px"' : '') +
            ' alt="' + esc(project.title + ' — documentation photograph ' + (index + 1)) + '" loading="lazy" decoding="async">' +
            '</a>'
          );
        }).join('') + '</div>'
      : '';

    const statusBody =
      '<dl class="doc-status">' +
      '<div><dt>Stage</dt><dd>' + (status
        ? '<span class="status-chip ' + esc(statusClass(status)) + '"><span class="status-dot"></span>' + esc(statusLabel) + '</span>'
        : placeholder('Not recorded')) + '</dd></div>' +
      '<div><dt>Last updated</dt><dd>' + updated + '</dd></div>' +
      '<div><dt>Current focus</dt><dd>' + (project.currentFocus ? esc(project.currentFocus) : placeholder('Not documented yet')) + '</dd></div>' +
      '<div><dt>Next steps</dt><dd>' + (project.futureWork ? esc(project.futureWork) : placeholder('Not documented yet')) + '</dd></div>' +
      '</dl>' +
      '<p class="doc-note">This page grows with the build log. Sections without entries are hidden rather than filled in.</p>';

    const sections = [
      section('01', 'overview', 'Overview', '<p>' + esc(project.summary) + '</p>'),
      section('02', 'concept', 'The concept', project.problem ? '<p>' + esc(project.problem) + '</p>' : ''),
      section('03', 'architecture', 'Engineering & architecture', architecture),
      section('04', 'development', 'Development', milestones ? '<div class="doc-log">' + milestones + '</div>' : ''),
      section('05', 'testing', 'Experiments & testing', project.results ? '<p>' + esc(project.results) + '</p>' : ''),
      section('06', 'media', 'Media', media),
      section('07', 'log', 'Development log', buildLog ? '<div class="doc-log">' + buildLog + '</div>' : ''),
      section('08', 'status', 'Current status', statusBody)
    ].join('');

    const specs = project.specs ? Object.keys(project.specs) : [];
    const specsBox = specs.length
      ? '<div class="spec-box"><div class="spec-box-title">Technical parameters</div><table class="spec-table"><tbody>' +
        specs.map(function (key) {
          return '<tr><th>' + esc(key) + '</th><td>' + esc(project.specs[key]) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '';

    const skills = (project.skills || []).map(function (skill) {
      return '<span class="tag">' + esc(skill) + '</span>';
    }).join('');

    const references = (project.links || []).filter(function (link) { return link && link.label; });
    const referencesBox = references.length
      ? '<div class="spec-box"><div class="spec-box-title">References</div><ul class="doc-refs">' +
        references.map(function (link) {
          const url = safeExternal(link.url);
          return '<li>' + (url
            ? '<a href="' + url + '" target="_blank" rel="noopener">' + esc(link.label) + ' &nearr;</a>'
            : '<span>' + esc(link.label) + ' ' + placeholder('link not recorded') + '</span>') + '</li>';
        }).join('') + '</ul></div>'
      : '';

    const related = projects.filter(function (candidate) {
      if (candidate.slug === project.slug) return false;
      if (candidate.category === project.category) return true;
      const mine = project.tags || [];
      const theirs = candidate.tags || [];
      return theirs.some(function (tag) { return mine.indexOf(tag) !== -1; });
    }).slice(0, 3);

    const relatedBox = related.length
      ? '<div class="spec-box"><div class="spec-box-title">Related projects</div><div class="doc-related">' +
        related.map(function (candidate) {
          return '<a href="project-' + esc(candidate.slug) + '.html">' +
            '<span class="doc-related-title">' + esc(candidate.shortTitle || candidate.title) + '</span>' +
            '<span class="doc-related-meta">' + esc(candidate.status || 'Status not recorded') + ' &rarr;</span></a>';
        }).join('') + '</div></div>'
      : '';

    const index = projects.findIndex(function (candidate) { return candidate.slug === project.slug; });
    const previous = index > 0 ? projects[index - 1] : null;
    const next = index > -1 && index < projects.length - 1 ? projects[index + 1] : null;
    const pager = (previous || next)
      ? '<nav class="doc-pager" aria-label="Project navigation">' +
        (previous ? '<a href="project-' + esc(previous.slug) + '.html"><span>Previous</span>' + esc(previous.shortTitle || previous.title) + '</a>' : '<span></span>') +
        (next ? '<a href="project-' + esc(next.slug) + '.html" class="is-next"><span>Next</span>' + esc(next.shortTitle || next.title) + '</a>' : '') +
        '</nav>'
      : '';

    const actions = [
      safeExternal(project.repo) ? '<a href="' + safeExternal(project.repo) + '" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Repository &nearr;</a>' : '',
      safeExternal(project.video) ? '<a href="' + safeExternal(project.video) + '" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">Demo video &nearr;</a>' : '',
      '<button type="button" class="btn btn-sm btn-secondary" onclick="window.print(); return false;">Print one-pager</button>',
      '<a href="projects.html" class="btn btn-sm btn-secondary">All projects</a>'
    ].join('');

    return (
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span>' +
      '<a href="projects.html">Projects</a><span>/</span><span aria-current="page">' + esc(project.shortTitle || project.title) + '</span></nav>' +
      '<header class="doc-head">' +
      '<div class="doc-kicker"><span>' + esc(project.category || 'Project') + '</span><span>' + timeframe + '</span></div>' +
      '<h1 class="doc-title-main">' + esc(project.title) + '</h1>' +
      '<div class="doc-meta-row">' +
      (status ? '<span class="status-chip ' + esc(statusClass(status)) + '"><span class="status-dot"></span>' + esc(statusLabel) + '</span>' : placeholder('Status not recorded')) +
      '<span class="doc-updated">Last updated ' + updated + '</span>' +
      '<span class="doc-tags">' + (project.tags || []).map(function (tag) { return '<span class="tag">' + esc(tag) + '</span>'; }).join('') + '</span>' +
      '</div>' +
      '<div class="doc-actions">' + actions + '</div>' +
      '</header>' +
      '<figure class="doc-cover"><img src="' + ContentBlocks.safeUrl(project.archiveImage || project.image) + '" alt="' + esc(project.title + ' — overview') + '" fetchpriority="high"></figure>' +
      '<div class="doc-layout">' +
      '<div class="doc-main">' + sections + '</div>' +
      '<aside class="doc-side" aria-label="Project facts">' + specsBox +
      (skills ? '<div class="spec-box"><div class="spec-box-title">Competencies</div><div class="tag-list">' + skills + '</div></div>' : '') +
      referencesBox + relatedBox + '</aside>' +
      '</div>' + pager
    );
  }

  return { render: render };
})();
