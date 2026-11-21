/**
 * AARUTHRUN PORTFOLIO — MILESTONE LEDGER
 * Merges dated project milestones from projects.json with education and
 * undated recognition from data/timeline.json. Undated facts stay undated.
 */

const TimelineLedger = (function () {
  'use strict';

  const esc = ContentBlocks.esc;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDay(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    if (parts.length < 3) return parts[0] || '';
    return Number(parts[2]) + ' ' + MONTHS[Number(parts[1]) - 1];
  }

  function yearOf(value) {
    return value ? String(value).slice(0, 4) : 'Undated';
  }

  function build(projects, timeline) {
    const events = [];

    (projects || []).forEach(function (project) {
      (project.milestones || []).forEach(function (milestone) {
        events.push({
          date: milestone.date || null,
          year: yearOf(milestone.date),
          day: fmtDay(milestone.date),
          type: (milestone.type || 'Milestone').toUpperCase(),
          title: milestone.label,
          detail: milestone.description,
          project: project.shortTitle || project.title,
          link: 'project-' + project.slug + '.html'
        });
      });
    });

    ((timeline && timeline.events) || []).forEach(function (event) {
      events.push({
        date: event.date || null,
        year: yearOf(event.date),
        day: event.date ? fmtDay(event.date) : (event.dateLabel || 'Date not recorded'),
        type: (event.type || 'Event').toUpperCase(),
        title: event.title,
        detail: event.detail,
        project: null,
        link: event.link || ''
      });
    });

    const groups = {};
    events.forEach(function (event) {
      if (!groups[event.year]) groups[event.year] = [];
      groups[event.year].push(event);
    });

    Object.keys(groups).forEach(function (year) {
      groups[year].sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      });
    });

    return Object.keys(groups).sort(function (a, b) {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return Number(b) - Number(a);
    }).map(function (year) {
      return { year: year, events: groups[year] };
    });
  }

  function render(container, projects, timeline) {
    const groups = build(projects, timeline);
    if (!groups.length) {
      container.innerHTML = '<p class="mono text-muted">No milestones recorded yet.</p>';
      return;
    }

    container.innerHTML = groups.map(function (group) {
      return '<div class="ledger-group">' +
        '<div class="ledger-year">' + esc(group.year) + '</div>' +
        '<div class="ledger-events">' + group.events.map(function (event) {
          return '<article class="ledger-event">' +
            '<div class="ledger-date">' + esc(event.day) + '</div>' +
            '<div class="ledger-body">' +
            '<div class="ledger-type">' + esc(event.type) + (event.project ? ' · ' + esc(event.project) : '') + '</div>' +
            '<h3>' + esc(event.title) + '</h3>' +
            (event.detail ? '<p>' + esc(event.detail) + '</p>' : '') +
            (event.link ? '<a href="' + esc(event.link) + '">' + (event.project ? 'Open project documentation' : 'View details') + ' &rarr;</a>' : '') +
            '</div></article>';
        }).join('') + '</div></div>';
    }).join('');
  }

  async function init() {
    const container = document.getElementById('timeline-ledger');
    if (!container) return;
    try {
      const results = await Promise.all([DataStore.getProjects(), ContentStore.getTimeline()]);
      render(container, results[0], results[1]);
    } catch (error) {
      console.error('[TimelineLedger] Unable to load milestones:', error);
      container.innerHTML = '<p class="mono text-muted">Unable to load the milestone ledger.</p>';
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return { init: init };
})();
