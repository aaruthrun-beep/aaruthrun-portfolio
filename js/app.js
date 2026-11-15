/**
 * AARUTHRUN PORTFOLIO — APPLICATION BOOTSTRAPPER
 * Main entry point that initializes all modules in correct order.
 * This replaces the legacy include.js for new pages.
 *
 * For backward compatibility, legacy pages can still use individual module scripts.
 */

(function () {
  'use strict';

  // Wait for DOM
  function bootstrap() {
    // 1. Load configuration (must be first)
    // AppConfig is a global loaded from config/app.config.js

    // 2. Initialize theme (must happen before rendering)
    if (typeof ThemeManager !== 'undefined') {
      ThemeManager.init();
    }

    // 3. Initialize header
    if (typeof HeaderManager !== 'undefined') {
      HeaderManager.init();
    }

    // 4. Initialize footer
    if (typeof FooterManager !== 'undefined') {
      FooterManager.init();
    }

    // 5. Initialize reveal animations (after DOM content)
    if (typeof RevealManager !== 'undefined') {
      RevealManager.init();
    }

    // 6. Initialize page-specific modules
    const page = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';

    // Projects module handles archive, detail, featured, and skills pages
    if (typeof ProjectManager !== 'undefined') {
      if (page === 'projects.html' || page === 'project.html' ||
          page === 'index.html' || page === 'skills.html') {
        // ProjectManager.autoInit() will detect the page
      }
    }

    // Timeline module
    if (typeof TimelineManager !== 'undefined') {
      if (page === 'timeline.html') {
        TimelineManager.init();
      }
    }

    // Gallery module
    if (typeof GalleryManager !== 'undefined') {
      if (page === 'gallery.html') {
        GalleryManager.init();
      }
    }

    // Dispatch ready event
    document.dispatchEvent(new CustomEvent('portfolio:ready'));
  }

  // Bootstrap when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // Handle page changes (for single-page navigation if implemented)
  window.addEventListener('portfolio:page-change', () => {
    // Re-initialize modules as needed
    if (typeof RevealManager !== 'undefined') {
      RevealManager.refresh();
    }
  });

})();
