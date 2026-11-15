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
   * Generate project card HTML
   */
  function renderProjectCard(proj, isLCP = false) {
    const statusClass = (proj.status || '').toLowerCase() === 'active' ? 'active' : 'completed';
    const statusText = (proj.status || 'Completed').toUpperCase();
    const dateRange = `${formatDate(proj.start)} — ${formatDate(proj.end)}`;

    const imgAttr = isLCP
      ? 'fetchpriority="high" width="960" height="600"'
      : 'loading="lazy" decoding="async" width="960" height="600"';

    return `
      <article class="col-4 reveal" style="--reveal-delay: ${(proj.__i || 0) % 3 * 0.07}s">
        <a href="project.html?slug=${proj.slug}" class="project-card-vertical" aria-label="View project: ${proj.title}">
          <div class="card-media">
            <img src="${proj.image}" alt="${proj.title} - Technical rendering" ${imgAttr}>
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
    const statusClass = (project.status || '').toLowerCase() === 'active' ? 'active' : 'completed';
    const statusText = (project.status || 'Completed').toUpperCase();
    const dateRange = `${formatDate(project.start)} — ${formatDate(project.end)}`;

    // Specs table
    const specsHtml = project.specs ? Object.entries(project.specs).map(([key, val]) => `
      <tr>
        <th>${key}</th>
        <td>${val}</td>
      </tr>
    `).join('') : '<tr><td colspan="2" class="mono text-muted">No specifications recorded</td></tr>';

    // Milestones
    const milestonesHtml = (project.milestones || []).map(m => `
      <div class="log-item reveal-child" style="--reveal-child-index: ${
        (m.__idx || 0)
      };">
        <div class="log-date">${formatDate(m.date)} // ${m.type ? m.type.toUpperCase() : 'MILESTONE'}</div>
        <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${m.label}</div>
        <div class="log-entry">${m.description}</div>
      </div>
    `).join('');

    // Build log
    const buildLogHtml = (project.buildLog || []).map((item, idx) => `
      <div class="log-item reveal-child" style="--reveal-child-index: ${
        (item.__idx || 0) + 10
      };">
        <div class="log-date">${formatFullDate(item.date) || item.date}</div>
        <div class="log-entry">${item.entry}</div>
      </div>
    `).join('');

    // Action buttons
    const repoBtn = project.repo ? `
      <a href="${project.repo}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">
        <span>VIEW REPO (GITHUB)</span> &rarr;
      </a>
    ` : '';

    const videoBtn = project.video ? `
      <a href="${project.video}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">
        <span>DEMO VIDEO</span> &nearr;
      </a>
    ` : '';

    // Project navigation sidebar
    const navHtml = allProjects.map(p => `
      <a href="project.html?slug=${p.slug}"
         class="${p.slug === project.slug ? 'text-accent' : ''}"
         style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); text-decoration: none;">
        <span>${p.shortTitle || p.title}</span>
        <span>${p.slug === project.slug ? '●' : '&rarr;'}</span>
      </a>
    `).join('');

    // Skills tags
    const skillsHtml = (project.skills || []).map(sk => `<span class="tag">${sk}</span>`).join('');

    return `
      <div class="detail-header reveal">
        <div class="reveal-child" style="--reveal-child-index: 0;">
          <a href="projects.html" class="detail-back">
            <span>&larr;</span> <span>RETURN TO PROJECT ARCHIVE</span>
          </a>
        </div>

        <div class="reveal-child" style="--reveal-child-index: 1; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1 class="detail-title">${project.title}</h1>
            <p class="detail-subtitle">${project.summary}</p>
          </div>
          <span class="status-chip ${statusClass}" style="font-size: 0.8125rem; padding: 4px 10px;">
            <span class="status-dot"></span>
            <span>${statusText}</span>
          </span>
        </div>

        <div class="reveal-child" style="--reveal-child-index: 2;">
          <div class="detail-meta-bar">
            <div class="detail-meta-item">
              <span class="text-muted">TIMEFRAME:</span>
              <span class="text-main">${dateRange}</span>
            </div>
            <div class="detail-meta-item">
              <span class="text-muted">CATEGORY:</span>
              <span class="text-accent">${project.category || 'Robotics'}</span>
            </div>
            <div class="detail-meta-item">
              <span class="text-muted">TAGS:</span>
              <span>${(project.tags || []).join(' &bull; ')}</span>
            </div>
          </div>
        </div>

        <div class="reveal-child" style="--reveal-child-index: 3;">
          <div class="detail-actions">
            ${repoBtn}
            ${videoBtn}
            <a href="timeline.html" class="btn btn-sm btn-secondary">VIEW IN TIMELINE &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Main Visual -->
      <div class="reveal-child" style="--reveal-child-index: 4; aspect-ratio: 16 / 10; margin-bottom: 32px; border: var(--border-default); background-color: var(--surface-subtle); overflow: hidden;">
        <img src="${project.image}" alt="${project.title} - Detailed technical view" fetchpriority="high" width="960" height="600">
      </div>

      <!-- Image Gallery Strip (when project has multiple photos) -->
      ${(project.images && project.images.length > 1) ? `
        <div class="reveal-child" style="--reveal-child-index: 5; margin-bottom: 32px;">
          <h3 class="detail-section-title" style="font-size: 0.875rem;">PROJECT PHOTOS</h3>
          <div class="gallery-strip">
            ${project.images.map(img => `
              <div class="gallery-strip-item">
                <img src="${img}" alt="${project.title} - Project photo" decoding="async" width="400" height="300" style="width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: var(--border-default); cursor: pointer;">
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Content Grid -->
      <div class="detail-grid">
        <div class="detail-main reveal">
          <section class="detail-section reveal-child" style="--reveal-child-index: 0;" id="section-problem">
            <h2 class="detail-section-title">01 // PROBLEM STATEMENT & RESEARCH OBJECTIVE</h2>
            <p>${project.problem || project.summary}</p>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 1;" id="section-architecture">
            <h2 class="detail-section-title">02 // SYSTEM ARCHITECTURE & DATA TOPOLOGY</h2>
            <p>${project.architecture || 'Distributed high-frequency control loops interfacing over robust differential industrial bus.'}</p>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 2;" id="section-mechanical">
            <h2 class="detail-section-title">03 // MECHANICAL ENGINEERING & CAD SPECIFICATIONS</h2>
            <p>${project.mechanical || 'Optimized structural kinematics, finite element analysis, and precision fabrication tolerances.'}</p>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 3;" id="section-electronics">
            <h2 class="detail-section-title">04 // ELECTRONICS & EMBEDDED FIRMWARE</h2>
            <p>${project.electronicsFirmware || 'Custom multilayer PCB layouts with real-time DMA timer interrupts and sensor feedback.'}</p>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 4;" id="section-control">
            <h2 class="detail-section-title">05 // CONTROL SYSTEMS & ALGORITHMIC ARCHITECTURE</h2>
            <p>${project.control || 'State-space feedback controllers, feedforward compensation, and analytical kinematics solutions.'}</p>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 5;" id="section-results">
            <h2 class="detail-section-title">06 // EMPIRICAL RESULTS & BENCHMARKS</h2>
            <p>${project.results || 'Validated repeatability, thermal dissipation, and real-time execution bounds.'}</p>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 6;" id="section-milestones">
            <h2 class="detail-section-title">07 // MILESTONES</h2>
            <div class="log-list">
              ${milestonesHtml || '<p class="mono text-muted">No milestones recorded.</p>'}
            </div>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 7;" id="section-build-log">
            <h2 class="detail-section-title">08 // CHRONOLOGICAL BUILD LOG</h2>
            <div class="log-list">
              ${buildLogHtml || '<p class="mono text-muted">No build log entries recorded.</p>'}
            </div>
          </section>

          <section class="detail-section reveal-child" style="--reveal-child-index: 8;" id="section-links">
            <h2 class="detail-section-title">09 // REFERENCES & REPOSITORIES</h2>
            ${(project.links || []).length > 0 ? `
              <ul style="list-style: square; padding-left: 20px; font-family: var(--font-mono); font-size: 0.8125rem;">
                ${project.links.map(lnk => `
                  <li style="margin-bottom: 8px;">
                    <a href="${lnk.url}" target="_blank" rel="noopener" class="text-accent">${lnk.label} &nearr;</a>
                  </li>
                `).join('')}
              </ul>
            ` : '<p class="mono text-muted">No external references.</p>'}
          </section>
        </div>

        <!-- Sidebar -->
        <aside class="detail-sidebar reveal">
          <div class="spec-box reveal-child" style="--reveal-child-index: 0;">
            <div class="spec-box-title">TECHNICAL PARAMETERS</div>
            <table class="spec-table">
              <tbody>${specsHtml}</tbody>
            </table>
          </div>

          <div class="spec-box reveal-child" style="--reveal-child-index: 1;">
            <div class="spec-box-title">ENGINEERING COMPETENCIES</div>
            <div class="tag-list" style="margin-top: 8px;">
              ${skillsHtml || '<span class="mono text-muted">No skills tagged</span>'}
            </div>
          </div>

          <div class="spec-box reveal-child" style="--reveal-child-index: 2;">
            <div class="spec-box-title">PROJECT NAVIGATION</div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 0.75rem;">
              ${navHtml}
            </div>
          </div>
        </aside>
      </div>
    `;
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
      const slug = urlParams.get('slug');

      const projects = await DataStore.getProjects();
      let project = null;

      if (slug) {
        project = DataStore.findProjectBySlug(slug);
      }

      if (!project) {
        project = projects[0] || null;
      }

      if (!project) {
        containerEl.innerHTML = '<p class="mono text-muted">No projects available.</p>';
        return;
      }

      // Update page title
      document.title = `${project.title} — ${AppConfig.getSite().title}`;

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
                            <a href="project.html?slug=${p.slug}" class="skill-proj-pill">
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

    setMeta('og:title', `${project.title} — ${site.title}`);
    setMeta('og:description', project.summary);
    setMeta('og:image', project.image);
    setMeta('twitter:title', `${project.title} — ${site.title}`);
    setMeta('twitter:description', project.summary);
    setMeta('twitter:image', project.image);
  }

  /**
   * Auto-detect and initialize appropriate page
   */
  function autoInit() {
    const page = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';

    // All pages need these
    Promise.all([
      DataStore.getProjects(),
    ]).then(() => {
      // Page-specific init
      switch (true) {
        case page === 'index.html' || page === '':
          initFeaturedSection();
          break;

        case page === 'projects.html':
          initArchivePage();
          break;

        case page === 'project.html':
          initDetailPage();
          break;

        case page === 'skills.html':
          initSkillsPage();
          break;

        case page === 'timeline.html':
          // Timeline module handles itself
          break;

        case page === 'gallery.html':
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
