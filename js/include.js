/**
 * AARUTHRUN PORTFOLIO — LEGACY COMPATIBILITY LAYER
 * 
 * This file provides backward compatibility with existing pages.
 * New pages should use js/loader.js instead for full modular functionality.
 * 
 * This legacy script will be deprecated once all pages are migrated.
 */

// If modules are already loaded via loader.js, use them
if (typeof ThemeManager !== 'undefined' && typeof HeaderManager !== 'undefined' && typeof FooterManager !== 'undefined') {
  // Modules already loaded, nothing to do
  console.log('[include.js] Modules already loaded via loader.js');
} else {
  // Fall back to legacy implementation
  (function () {
    'use strict';

    // Theme state
    const STORAGE_KEY = 'portfolio-theme';
    const DARK = 'dark';
    const LIGHT = 'light';

    function getPreferredTheme() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === DARK || stored === LIGHT) return stored;
      return LIGHT;
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(STORAGE_KEY, theme);
    }

    // Apply theme immediately
    applyTheme(getPreferredTheme());

    // Determine current page
    function getCurrentPage() {
      const path = window.location.pathname;
      const page = path.split('/').pop().split('?')[0] || 'index.html';
      if (page === '' || page === '/') return 'index.html';
      return page;
    }

    const currentPage = getCurrentPage();

    // Navigation items
    const navItems = [
      { label: 'About', href: 'index.html' },
      { label: 'Projects', href: 'projects.html' },
      { label: 'Timeline', href: 'timeline.html' },
      { label: 'Gallery', href: 'gallery.html' },
      { label: 'Skills', href: 'skills.html' },
      { label: 'Startups', href: 'startup.html' },
      { label: 'Journal', href: 'journal.html' },
      { label: 'Education', href: 'education.html' },
      { label: 'Contact', href: 'contact.html' }
    ];

    // Render header
    function renderHeader() {
      const headerEl = document.getElementById('site-header');
      if (!headerEl) return;

      headerEl.innerHTML = `
        <div class="container nav-container">
          <a href="index.html" class="brand-link" aria-label="Aaruthrun Portfolio Home">
            <span>AARUTHRUN</span>
          </a>

          <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation menu">
            [MENU]
          </button>

          <nav class="site-nav" id="site-nav" aria-label="Main Navigation">
            <ul class="nav-list" role="menubar">
              ${navItems.map(item => {
                const isActive = (currentPage === item.href) || 
                                 (item.href === 'projects.html' && currentPage === 'project.html') ||
                                 (item.href === 'startup.html' && currentPage === 'startup-agritech.html');
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

      // Mobile toggle
      const toggleBtn = document.getElementById('nav-toggle');
      const navMenu = document.getElementById('site-nav');
      if (toggleBtn && navMenu) {
        toggleBtn.addEventListener('click', () => {
          const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
          toggleBtn.setAttribute('aria-expanded', !isExpanded);
          toggleBtn.textContent = !isExpanded ? '[CLOSE]' : '[MENU]';
          navMenu.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
          if (!headerEl.contains(e.target) && navMenu.classList.contains('open')) {
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.textContent = '[MENU]';
            navMenu.classList.remove('open');
          }
        });
      }
    }

    // Render footer
    function renderFooter() {
      const footerEl = document.getElementById('site-footer');
      if (!footerEl) return;

      footerEl.innerHTML = `
        <div class="container">
          <div class="footer-grid">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <img class="avatar avatar-square" src="images/aaruthrun.jpeg" alt="Aaruthrun" width="40" height="40" loading="lazy">
                <div class="footer-brand" style="margin-bottom: 0;">AARUTHRUN</div>
              </div>
              <p class="footer-desc">
                Robotics and Automation Engineering student at PSG College of Technology.
                Building multi-axis robotic manipulators, BLDC Field-Oriented Control (FOC) drives,
                modular swarm systems, and real-time embedded firmware.
              </p>
            </div>

            <div>
              <div class="footer-col-title">Connect</div>
              <ul class="footer-links">
                <li><a href="mailto:aaruthrun@gmail.com" target="_blank" rel="noopener">aaruthrun@gmail.com</a></li>
                <li><a href="https://github.com/aaruthrun-beep" target="_blank" rel="noopener">GitHub // @aaruthrun-beep</a></li>
                <li><a href="https://linkedin.com/in/aaruthrun-saravanakumar" target="_blank" rel="noopener">LinkedIn Profile</a></li>
                <li><a href="contact.html">Send Secure Message</a></li>
                <li><a href="index.html#about-bio">Technical Bio &amp; Philosophy</a></li>
              </ul>
            </div>
          </div>
          <blockquote class="engineering-quote" style="margin-top: 16px; margin-bottom: 24px;">
            <p class="engineering-quote-body" style="font-size: 0.875rem;">
              "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration."
            </p>
            <div class="engineering-quote-cite" style="font-size: 0.625rem;">
              <span class="engineering-quote-author">NIKOLA TESLA</span>
            </div>
          </blockquote>
          <div class="footer-bottom">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div>
                &copy; ${new Date().getFullYear()} Aaruthrun.
              </div>
              <button class="theme-toggle" id="theme-toggle" title="Toggle light/dark theme" aria-label="Toggle theme" style="margin-left: auto;">
                <span class="toggle-icon" id="toggle-icon">☀️</span>
                <span id="toggle-label">LIGHT</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Reveal animations
    function initReveal() {
      const els = document.querySelectorAll('.reveal:not([data-reveal-obs])');
      if (!els.length) return;

      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !('IntersectionObserver' in window)) {
        els.forEach(el => {
          el.classList.add('reveal-in');
          el.querySelectorAll(':scope > .reveal-child, :scope > .project-card, :scope > .project-card-vertical, :scope > .skill-item')
            .forEach(c => c.classList.add('reveal-in'));
          el.setAttribute('data-reveal-obs', '1');
        });
        return;
      }

      if (!initReveal.observer) {
        initReveal.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal-in');
              entry.target.querySelectorAll(':scope > .reveal-child, :scope > .project-card, :scope > .project-card-vertical, :scope > .skill-item')
                .forEach(c => c.classList.add('reveal-in'));
              initReveal.observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.06, rootMargin: '0px 0px -48px 0px' });
      }

      els.forEach(el => {
        el.setAttribute('data-reveal-obs', '1');
        initReveal.observer.observe(el);
      });
    }

    // Execute
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        renderHeader();
        renderFooter();
        initReveal();
        setupThemeToggle();
      });
    } else {
      renderHeader();
      renderFooter();
      initReveal();
      setupThemeToggle();
    }

    // Theme toggle
    function setupThemeToggle() {
      const toggle = document.getElementById('theme-toggle');
      const icon = document.getElementById('toggle-icon');
      const label = document.getElementById('toggle-label');
      if (!toggle || !icon || !label) return;

      function updateUI(theme) {
        if (theme === DARK) {
          icon.textContent = '🌙';
          label.textContent = 'DARK';
        } else {
          icon.textContent = '☀️';
          label.textContent = 'LIGHT';
        }
      }

      updateUI(document.documentElement.getAttribute('data-theme') || LIGHT);

      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || LIGHT;
        const next = current === DARK ? LIGHT : DARK;
        applyTheme(next);
        updateUI(next);
      });
    }

    // Re-scan for new reveal elements
    document.addEventListener('portfolio:updated', initReveal);

  })();
}