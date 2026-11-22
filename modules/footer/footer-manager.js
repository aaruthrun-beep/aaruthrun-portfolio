/**
 * AARUTHRUN PORTFOLIO — FOOTER MANAGER MODULE
 * Injects and manages the site footer.
 */

const FooterManager = (function () {
  'use strict';

  // DOM reference
  let footerEl = null;

  /**
   * Build footer HTML
   */
  function buildFooterHTML() {
    const config = AppConfig.getFooter();
    const author = AppConfig.getAuthor();
    const year = config.currentYear;

    return `
      <div class="container">
        <div class="footer-grid">
          <!-- Brand Column -->
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <img class="avatar avatar-square" src="images/aaruthrun.jpeg" alt="${author.name}" width="40" height="40" loading="lazy">
              <div class="footer-brand" style="margin-bottom: 0;">AARUTHRUN</div>
            </div>
            <p class="footer-desc">
              Robotics and Automation Engineering student at PSG College of Technology.
              Building multi-axis robotic manipulators, BLDC Field-Oriented Control (FOC) drives,
              modular swarm systems, and real-time embedded firmware.
            </p>
          </div>

          <!-- Connect Column -->
          <div>
            <div class="footer-col-title">Connect</div>
            <ul class="footer-links">
              ${config.links.connect.map(link => `
                <li><a href="${link.href}" ${link.external ? 'target="_blank" rel="noopener"' : ''}>${link.label}</a></li>
              `).join('')}
            </ul>
          </div>

        </div>

        <!-- Bottom Bar -->
        <div class="footer-bottom">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div>
              &copy; ${year} ${author.name}.
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

  /**
   * Render footer
   */
  function render() {
    footerEl = document.getElementById('site-footer');
    if (!footerEl) return;

    footerEl.className = 'site-footer';
    footerEl.innerHTML = buildFooterHTML();
  }

  /**
   * Initialize
   */
  function init() {
    render();
  }

  // Auto-init
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Re-render when content updates
  document.addEventListener('portfolio:updated', () => {
    if (footerEl) render();
  });

  // Public API
  return {
    init,
    render,
  };
})();
