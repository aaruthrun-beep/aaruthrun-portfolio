/**
 * AARUTHRUN PORTFOLIO — PROJECT MANAGER MODULE
 * Renders project cards, grids, and detail views.
 * Uses DataStore for data and FilterManager for filtering.
 */

const ProjectManager = (function () {
  'use strict';

  // Date formatting
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  /**
   * Format date string "2024-03" -> "MAR 2024"
   */
  function formatDate(dStr) {
    if (!dStr) return 'PRESENT';
    const parts = dStr.split('-');
    if (parts.length < 2) return dStr;
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${MONTHS[mIdx] || parts[1]} ${parts[0]}`;
  }

  /**
   * Format full date "2024-03-14" -> "MAR 14, 2024"
   */
  function formatFullDate(dStr) {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length < 3) return formatDate(dStr);
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${MONTHS[mIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
  }

  /**
   * Address of a project's prerendered page (tools/build-pages.mjs).
   * Sharing project-<slug>.html is what carries the title, description
   * and photograph into a link preview.
   */
  function projectHref(slug) {
    return 'project-' + encodeURIComponent(slug) + '.html';
  }

  /**
   * Generate project card HTML
   */
  function renderProjectCard(proj, isLCP = false) {
    const statusClass = (proj.status || '').toLowerCase() === 'active' ? 'active' : 'completed';
    const statusText = (proj.status || 'Completed').toUpperCase();
    const dateRange = `${formatDate(proj.start)} — ${formatDate(proj.end)}`;

    const imgAttr = isLCP
      ? 'fetchpriority="high" width="960" height="600"'
      : 'loading="lazy" decoding="async" width="960" height="600"';
    const set = typeof ContentBlocks !== 'undefined' && ContentBlocks.srcset
      ? ContentBlocks.srcset(proj.image)
      : '';
    const srcsetAttr = set
      ? ` srcset="${set}" sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 31vw"`
      : '';

    return `
      <article class="col-4 reveal" style="--reveal-delay: ${(proj.__i || 0) % 3 * 0.07}s">
        <a href="${projectHref(proj.slug)}" class="project-card-vertical" aria-label="View project: ${proj.title}">
          <div class="card-media">
            <img src="${proj.image}"${srcsetAttr} alt="${proj.title} - Technical rendering" ${imgAttr}>
          </div>
          <div class="card-body">
            <div>
              <div class="card-meta">
                <span class="mono text-accent" style="font-size: 0.75rem;">${dateRange}</span>
                <span class="status-chip ${statusClass}">
                  <span class="status-dot"></span>
                  <span>${statusText}</span>
                </span>
              </div>
              <h3 class="card-title">${proj.title}</h3>
              <p class="card-summary">${proj.summary}</p>
            </div>
            <div>
              ${proj.monoSpec ? `<div class="mono-spec" title="${proj.monoSpec}">${proj.monoSpec}</div>` : ''}
              <div class="card-footer">
                <div class="tag-list">
                  ${(proj.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  /**
   * Generate filter controls HTML
   */
  function renderFilterControls(containerEl) {
    const filterConfig = AppConfig.getFilters();

    containerEl.innerHTML = `
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label">Domain:</span>
          ${filterConfig.tags.map(t => `
            <button class="filter-btn ${t === 'ALL' ? 'active' : ''}" data-filter-tag="${t}">
              ${t.toUpperCase()}
            </button>
          `).join('')}
        </div>
        <div class="filter-group">
          <span class="filter-label">Status:</span>
          ${filterConfig.statuses.map(s => `
            <button class="filter-btn ${s === 'ALL' ? 'active' : ''}" data-filter-status="${s}">
              ${s.toUpperCase()}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Setup filter event listeners
   */
  function setupFilterListeners(filterContainerEl, filterManager) {
    if (!filterContainerEl || !filterManager) return;

    // Tag buttons
    filterContainerEl.querySelectorAll('[data-filter-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterContainerEl.querySelectorAll('[data-filter-tag]').forEach(b =>
          b.classList.remove('active'));
        btn.classList.add('active');
        filterManager.setTag(btn.getAttribute('data-filter-tag'));
      });
    });

    // Status buttons
    filterContainerEl.querySelectorAll('[data-filter-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterContainerEl.querySelectorAll('[data-filter-status]').forEach(b =>
          b.classList.remove('active'));
        btn.classList.add('active');
        filterManager.setStatus(btn.getAttribute('data-filter-status'));
      });
    });
  }

  /**
   * Render project grid
   */
  function renderGrid(gridEl, projects) {
    if (!gridEl) return;

    // The archive page uses the featured/compact hierarchy renderer.
    if (typeof ProjectArchive !== 'undefined') {
      ProjectArchive.render(gridEl, projects);
      return;
    }

    if (!projects || projects.length === 0) {
      gridEl.innerHTML = `
        <div class="col-12" style="padding: 48px 0; text-align: center;">
          <p class="mono">NO PROJECTS MATCH SELECTED FILTER CRITERIA.</p>
          <button class="btn btn-sm btn-mono" id="btn-reset-filters">RESET FILTERS</button>
        </div>
      `;

      const resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          // Dispatch reset event
          document.dispatchEvent(new CustomEvent('portfolio:filter-reset'));
        });
      }
      return;
    }

    gridEl.innerHTML = projects.map((p, idx) => {
      p.__i = idx;
      return renderProjectCard(p, idx === 0);
    }).join('');

    // Notify reveal manager
    document.dispatchEvent(new CustomEvent('portfolio:updated'));
  }

  /**
   * Generate project detail HTML
   */
  function renderProjectDetail(project, allProjects = []) {
    if (typeof ProjectDetail === 'undefined') {
      console.error('[ProjectManager] ProjectDetail renderer is not loaded.');
      return '<p class="mono text-muted">Unable to render project documentation.</p>';
    }
    return ProjectDetail.render(project, allProjects);
  }

  /**
   * Initialize featured projects section (home page)
   */
  async function initFeaturedSection() {
    const gridEl = document.getElementById('featured-projects-grid');
    if (!gridEl) return;

    try {
      const projects = await DataStore.getProjects();
      const featured = projects.filter(p => p.featured).slice(0, 6);

      gridEl.innerHTML = featured.map((p, idx) => {
        p.__i = idx;
        return renderProjectCard(p, idx === 0);
      }).join('');

      document.dispatchEvent(new CustomEvent('portfolio:updated'));
    } catch (error) {
      console.error('[ProjectManager] Failed to load featured projects:', error);
      gridEl.innerHTML = `
        <div class="col-12">
          <p class="mono text-muted">Unable to load featured projects.</p>
        </div>
      `;
    }
  }

  /**
   * Initialize project archive page
   */
  async function initArchivePage() {
    const gridEl = document.getElementById('projects-grid');
    const filterContainer = document.getElementById('filter-controls');

    if (!gridEl) return;

    try {
      const projects = await DataStore.getProjects();

      // Create filter manager
      const filterManager = FilterManager.create({
        items: projects,
        onFilterChange: (filtered) => {
          renderGrid(gridEl, filtered);
        },
      });

      // Render and setup filters
      if (filterContainer) {
        renderFilterControls(filterContainer);
        setupFilterListeners(filterContainer, filterManager);
      }

      // Initial render
      renderGrid(gridEl, projects);

      // Store filter manager for external access
      window.__projectFilterManager = filterManager;

      // Listen for reset events
      document.addEventListener('portfolio:filter-reset', () => {
        filterManager.reset();
        if (filterContainer) {
          filterContainer.querySelectorAll('.filter-btn').forEach(b =>
            b.classList.remove('active'));
          filterContainer.querySelectorAll('[data-filter-tag="ALL"], [data-filter-status="ALL"]')
            .forEach(b => b.classList.add('active'));
        }
      });

    } catch (error) {
      console.error('[ProjectManager] Failed to load archive:', error);
      gridEl.innerHTML = `
        <div class="col-12">
          <p class="mono text-muted">Unable to load project database.</p>
        </div>
      `;
    }
  }

  /**
   * Initialize project detail page
   */
  async function initDetailPage() {
    const containerEl = document.getElementById('project-detail-container');
    if (!containerEl) return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      // A prerendered page carries its slug on the body; the documented
      // template still reads it from ?slug=.
      const slug = document.body.dataset.slug || urlParams.get('slug');

      const projects = await DataStore.getProjects();
      let project = null;

      if (slug) {
        project = DataStore.findProjectBySlug(slug);
      }

      if (!project) {
        // A prerendered address that no longer exists should say so rather
        // than quietly showing a different build under the wrong title.
        if (document.body.dataset.slug) {
          containerEl.innerHTML = '<p class="mono text-muted">That project is no longer in the archive. <a href="projects.html">Browse every build</a>.</p>';
          return;
        }
        project = projects[0] || null;
      }

      if (!project) {
        containerEl.innerHTML = '<p class="mono text-muted">No projects available.</p>';
        return;
      }

      // Update page title
      document.title = `${project.title} — Aaruthrun`;

      // The documented address is ?slug=; point crawlers at the prerendered
      // page, which ships the same content as static metadata. A prerendered
      // page already carries the right canonical and must keep it.
      if (urlParams.get('slug')) {
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
          canonical.setAttribute('href', new URL(projectHref(project.slug), window.location.href).href);
        }
      }

      // Render detail
      containerEl.innerHTML = renderProjectDetail(project, projects);
      document.dispatchEvent(new CustomEvent('portfolio:updated'));

      // Update OG tags
      updateOGTags(project);

    } catch (error) {
      console.error('[ProjectManager] Failed to load detail:', error);
      containerEl.innerHTML = '<p class="mono text-muted">Unable to load project details.</p>';
    }
  }

  /**
   * Initialize skills page
   */
  async function initSkillsPage() {
    const container = document.getElementById('skills-matrix-container');
    if (!container) return;

    try {
      const projects = await DataStore.getProjects();
      const domains = AppConfig.getSkillsDomains();

      container.innerHTML = domains.map(domain => {
        return `
          <div class="skills-domain-card">
            <div class="domain-header">
              <h2 class="domain-title">${domain.title}</h2>
              <span class="mono text-muted" style="font-size: 0.75rem;">${domain.skills.length} COMPETENCIES</span>
            </div>
            <div class="skills-grid">
              ${domain.skills.map(sk => {
                const matched = projects.filter(p =>
                  (p.skills || []).some(s => s.toLowerCase() === sk.name.toLowerCase())
                );

                return `
                  <div class="skill-item">
                    <div class="skill-name">
                      <span>${sk.name}</span>
                      <span class="mono text-accent" style="font-size: 0.6875rem;">
                        ${matched.length} PROJ
                      </span>
                    </div>
                    <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4;">
                      ${sk.note}
                    </p>
                    <div class="skill-links">
                      ${matched.length > 0
                        ? matched.map(p => `
                            <a href="${projectHref(p.slug)}" class="skill-proj-pill">
                              ${p.shortTitle || p.title} &rarr;
                            </a>
                          `).join('')
                        : '<span class="mono text-muted" style="font-size: 0.6875rem;">FOUNDATIONAL LAB TOOL</span>'
                      }
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');

      document.dispatchEvent(new CustomEvent('portfolio:updated'));

    } catch (error) {
      console.error('[ProjectManager] Failed to load skills:', error);
    }
  }

  /**
   * Update OpenGraph tags for project pages
   */
  function updateOGTags(project) {
    if (!project) return;
    // A prerendered page already ships its final tags; rewriting them here
    // would only drift from what the crawler was served.
    if (document.body.dataset.page === 'project') return;

    const site = AppConfig.getSite();

    // Update meta tags if they exist
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[property="${name}"]`) ||
        document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (name.startsWith('og:')) {
          el.setAttribute('property', name);
        } else {
          el.setAttribute('name', name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // The generated card carries the photo, the name and the spec. The raw
    // project photograph is multi-megabyte and unfurlers skip or shrink it.
    const card = new URL(`images/og/project-${project.slug}.jpg`, site.url + '/').href;

    setMeta('og:title', `${project.title} — ${site.title}`);
    setMeta('og:description', project.summary);
    setMeta('og:image', card);
    setMeta('twitter:title', `${project.title} — ${site.title}`);
    setMeta('twitter:description', project.summary);
    setMeta('twitter:image', card);
  }

  /**
   * Auto-detect and initialize appropriate page
   */
  function autoInit() {
    const page = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';
    // Prerendered pages declare their kind on <body> instead of the filename.
    const route = document.body.dataset.page || page;

    // All pages need these
    Promise.all([
      DataStore.getProjects(),
    ]).then(() => {
      // Page-specific init
      switch (true) {
        case route === 'index.html' || route === '':
          initFeaturedSection();
          break;

        case route === 'projects.html':
          initArchivePage();
          break;

        case route === 'project.html' || route === 'project':
          initDetailPage();
          break;

        case route === 'skills.html':
          initSkillsPage();
          break;

        case route === 'timeline.html':
          // Timeline module handles itself
          break;

        case route === 'gallery.html':
          // Gallery module handles itself
          break;

        default:
          // Other pages don't need project rendering
          break;
      }
    });
  }

  // Initialize when DOM ready
  if (document.readyState !== 'loading') {
    autoInit();
  } else {
    document.addEventListener('DOMContentLoaded', autoInit);
  }

  // Public API
  return {
    renderProjectCard,
    renderGrid,
    renderProjectDetail,
    formatDate,
    formatFullDate,
    initFeaturedSection,
    initArchivePage,
    initDetailPage,
    initSkillsPage,
    autoInit,
  };
})();
