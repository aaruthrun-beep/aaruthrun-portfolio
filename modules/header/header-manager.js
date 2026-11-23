/**
 * AARUTHRUN PORTFOLIO — HEADER MANAGER MODULE
 * Injects and manages the site header with navigation.
 */

const HeaderManager = (function () {
  'use strict';

  // DOM reference
  let headerEl = null;
  let toggleBtn = null;
  let navMenu = null;

  // State
  let currentPage = 'index.html';
  let scrollBound = false;

  /**
   * Get current page from URL
   */
  function detectCurrentPage() {
    const path = window.location.pathname;
    let page = path.split('/').pop().split('?')[0] || 'index.html';

    if (page === '' || page === '/') {
      page = 'index.html';
    }

    // Normalize certain pages
    if (page === 'project.html') {
      page = 'projects.html'; // Treat project detail as projects page for nav highlighting
    }

    if (page === 'journal-entry.html') {
      page = 'journal.html';
    }

    return page;
  }

  /**
   * Check if nav item should be marked active
   */
  function isNavItemActive(itemHref) {
    // Exact match
    if (currentPage === itemHref) return true;

    // Special cases
    if (itemHref === 'projects.html' && currentPage === 'project.html') return true;
    if (itemHref === 'startup.html' && currentPage === 'startup-agritech.html') return true;

    // Check hash links
    if (itemHref.includes('#')) {
      return window.location.hash === itemHref ||
             window.location.hash === '' && currentPage === itemHref.split('#')[0];
    }

    return false;
  }

  /**
   * Build navigation HTML
   */
  function buildNavHTML() {
    const navItems = AppConfig.getNav().items;
    const brand = AppConfig.getNav().brand;

    return `
      <div class="container nav-container">
        <a href="${brand.href}" class="brand-link" aria-label="Aaruthrun Portfolio Home">
          <img class="brand-avatar" src="images/logo/aaruthrun-logo.png" alt="" width="32" height="32" aria-hidden="true" decoding="async">
          <span>${brand.label}</span>
        </a>

        <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation menu">
          [MENU]
        </button>

        <nav class="site-nav" id="site-nav" aria-label="Main Navigation">
          <ul class="nav-list" role="menubar">
            ${navItems.map(item => {
              const isActive = isNavItemActive(item.href);
              return `
                <li class="nav-item" role="none">
                  <a href="${item.href}"
                     class="nav-link ${isActive ? 'active' : ''}"
                     role="menuitem"
                     ${isActive ? 'aria-current="page"' : ''}>
                    ${item.label}
                  </a>
                </li>
              `;
            }).join('')}
          </ul>
        </nav>
      </div>
    `;
  }

  /**
   * Render header
   */
  function render() {
    headerEl = document.getElementById('site-header');
    if (!headerEl) return;

    headerEl.className = 'site-header';
    headerEl.innerHTML = buildNavHTML();

    // Cache DOM references
    toggleBtn = document.getElementById('nav-toggle');
    navMenu = document.getElementById('site-nav');

    // Setup mobile toggle
    if (toggleBtn && navMenu) {
      setupMobileToggle();
    }

    // Setup smooth scroll for anchor links
    setupAnchorScroll();

    // Mark the header once the page has scrolled
    setupScrollState();
  }

  /**
   * Add a quiet shadow when the sticky header sits above content
   */
  function setupScrollState() {
    if (!headerEl) return;

    function update() {
      headerEl.classList.toggle('is-scrolled', window.scrollY > 8);
    }

    if (!scrollBound) {
      window.addEventListener('scroll', update, { passive: true });
      scrollBound = true;
    }

    update();
  }

  /**
   * Setup mobile navigation toggle
   */
  function setupMobileToggle() {
    toggleBtn.addEventListener('click', function () {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      toggleBtn.textContent = !isExpanded ? '[CLOSE]' : '[MENU]';
      navMenu.classList.toggle('open');
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
      if (headerEl && !headerEl.contains(e.target) && navMenu && navMenu.classList.contains('open')) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.textContent = '[MENU]';
        navMenu.classList.remove('open');
      }
    });

    // Close on escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu && navMenu.classList.contains('open')) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.textContent = '[MENU]';
        navMenu.classList.remove('open');
        toggleBtn.focus();
      }
    });
  }

  /**
   * Setup smooth scroll for anchor links
   */
  function setupAnchorScroll() {
    headerEl.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();
      const headerHeight = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height')) || 52;

      const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.history.pushState(null, '', targetId);
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    });
  }

  /**
   * Update current page (call on navigation)
   */
  function refresh() {
    currentPage = detectCurrentPage();
    render();
  }

  /**
   * Initialize
   */
  function init() {
    currentPage = detectCurrentPage();
    render();

    // Listen for page updates
    window.addEventListener('portfolio:page-change', () => {
      refresh();
    });
  }

  // Auto-init
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Re-render when new content is injected
  document.addEventListener('portfolio:updated', () => {
    if (headerEl) render();
  });

  // Public API
  return {
    init,
    render,
    refresh,
    getCurrentPage: () => currentPage,
    isNavActive: (href) => isNavItemActive(href),
  };
})();
