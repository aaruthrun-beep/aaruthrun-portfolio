/**
 * AARUTHRUN PORTFOLIO — SKILLS INDEX
 * Renders the discipline matrix from data/skills.json and links each capability
 * only to projects that already list it. No proficiency scores, no invented links.
 */

const SkillsIndex = (function () {
  'use strict';

  const esc = ContentBlocks.esc;

  function renderEvidence(category, projects) {
    const evidence = category.evidence || [];
    if (!evidence.length) return '';

    const items = evidence.map(function (item, index) {
      const project = projects.find(function (p) { return p.slug === item.project; });
      const projectHref = project ? 'project-' + encodeURIComponent(project.slug) + '.html' : '';
      const projectLabel = project ? (project.shortTitle || project.title) : '';
      const caption = [item.title, item.caption].filter(Boolean).join(' — ');
      const skillLabels = (item.skills || []).join(' · ');

      return (
        '<article class="skill-evidence-item">' +
        '<a class="skill-evidence-media js-lightbox" href="' + esc(item.image) + '"' +
        ' data-lightbox-group="skill-evidence"' +
        ' data-caption="' + esc(caption) + '"' +
        (projectHref ? ' data-project="' + esc(projectHref) + '"' : '') +
        ' aria-label="View larger: ' + esc(item.title) + '">' +
        '<img src="' + esc(item.image) + '" alt="' + esc(item.alt) + '" loading="lazy">' +
        '<span class="skill-evidence-view">View image <span aria-hidden="true">↗</span></span>' +
        '</a>' +
        '<div class="skill-evidence-copy">' +
        '<div class="skill-evidence-meta"><span>' + String(index + 1).padStart(2, '0') + ' / ' + esc(projectLabel) + '</span><span>' + esc(skillLabels) + '</span></div>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p>' + esc(item.caption) + '</p>' +
        (projectHref ? '<a class="skill-evidence-project" href="' + esc(projectHref) + '">Project reference: ' + esc(projectLabel) + ' <span aria-hidden="true">&rarr;</span></a>' : '') +
        '</div>' +
        '</article>'
      );
    }).join('');

    return (
      '<div class="skill-evidence" aria-label="Visual evidence for ' + esc(category.title) + '">' +
      '<div class="skill-evidence-head"><span>Visual evidence</span><span>' + evidence.length + ' record' + (evidence.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="skill-evidence-grid">' + items + '</div>' +
      '</div>'
    );
  }

  function render(container, skills, projects) {
    const categories = (skills && skills.categories) || [];
    if (!categories.length) {
      container.innerHTML = '<p class="mono text-muted">The skills index is empty. Add categories to data/skills.json.</p>';
      return;
    }

    container.innerHTML = categories.map(function (category, index) {
      const items = (category.items || []).map(function (item) {
        const linked = (item.projects || []).map(function (slug) {
          return projects.find(function (project) { return project.slug === slug; });
        }).filter(Boolean);

        return (
          '<div class="skill-entry">' +
          '<h3>' + esc(item.name) + '</h3>' +
          '<div class="skill-entry-projects">' +
          (linked.length
            ? linked.map(function (project) {
                return '<a href="project-' + esc(project.slug) + '.html">' + esc(project.shortTitle || project.title) + '</a>';
              }).join('')
            : '<span class="skill-entry-empty">No project linked yet</span>') +
          '</div></div>'
        );
      }).join('');

      return (
        '<section class="skill-category" id="' + esc(category.id) + '" aria-labelledby="' + esc(category.id) + '-title">' +
        '<header class="skill-category-head">' +
        '<span class="skill-category-num">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<h2 id="' + esc(category.id) + '-title">' + esc(category.title) + '</h2>' +
        '<span class="skill-category-count">' + (category.items || []).length + ' capabilities</span>' +
        '</header>' +
        '<div class="skill-entry-list">' + items + renderEvidence(category, projects) + '</div>' +
        '</section>'
      );
    }).join('');
  }

  async function init() {
    const container = document.getElementById('skills-index');
    if (!container) return;
    try {
      const results = await Promise.all([ContentStore.getSkills(), DataStore.getProjects()]);
      render(container, results[0], results[1]);
    } catch (error) {
      console.error('[SkillsIndex] Unable to load skills:', error);
      container.innerHTML = '<p class="mono text-muted">Unable to load the skills index.</p>';
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return { init: init };
})();
