/**
 * AARUTHRUN PORTFOLIO — REVEAL MANAGER MODULE
 * Handles scroll-triggered reveal animations with IntersectionObserver.
 */

const RevealManager = (function () {
  'use strict';

  // Observer instance (singleton)
  let observer = null;

  // Whether reduced motion is preferred
  let prefersReducedMotion = false;

  // Lazily get config — avoids top-level AppConfig dependency issues
  function getConfig() {
    try {
      return AppConfig && AppConfig.getAnimations ? AppConfig.getAnimations() : null;
    } catch (e) {
      return null;
    }
  }

  /** 
   * Check reduced motion preference
   */
  function checkReducedMotion() {
    const cfg = getConfig();
    const prefers = (cfg && cfg.reducedMotion && cfg.reducedMotion.prefers) 
      || '(prefers-reduced-motion: reduce)';
    if (window.matchMedia && window.matchMedia(prefers).matches) {
      prefersReducedMotion = true;
      return true;
    }
    return false;
  }

  /**
   * Create observer instance
   */
  function createObserver() {
    if (observer) return observer;

    const cfg = getConfig();
    const threshold = (cfg && cfg.reveal && cfg.reveal.threshold) || 0.06;
    const rootMargin = (cfg && cfg.reveal && cfg.reveal.rootMargin) || '0px 0px -48px 0px';

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');

          // Reveal staggered children
          const children = entry.target.querySelectorAll(
            ':scope > .reveal-child, ' +
            ':scope > .project-card, ' +
            ':scope > .project-card-vertical, ' +
            ':scope > .skill-item, ' +
            ':scope > .vgantt-row'
          );

          children.forEach(child => {
            child.classList.add('reveal-in');
          });

          // Unobserve after reveal
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: threshold,
      rootMargin: rootMargin,
    });

    return observer;
  }

  /**
   * Is the element already on screen?
   */
  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /**
   * Reveal a single element immediately
   */
  function revealImmediately(el) {
    if (!el) return;
    el.classList.add('reveal-in');

    // Also reveal children
    const children = el.querySelectorAll(
      ':scope > .reveal-child, ' +
      ':scope > .project-card, ' +
      ':scope > .project-card-vertical, ' +
      ':scope > .skill-item, ' +
      ':scope > .vgantt-row'
    );
    children.forEach(child => child.classList.add('reveal-in'));
  }

  /**
   * Initialize reveal on all .reveal elements
   */
  function init() {
    // Check reduced motion
    if (checkReducedMotion()) {
      // Reveal everything immediately
      document.querySelectorAll('.reveal:not([data-reveal-obs])').forEach(el => {
        revealImmediately(el);
        el.setAttribute('data-reveal-obs', '1');
      });
      return;
    }

    // Create observer if needed
    const obs = createObserver();

    // Find all reveal elements
    const els = document.querySelectorAll('.reveal:not([data-reveal-obs])');
    if (!els.length) return;

    els.forEach(el => {
      el.setAttribute('data-reveal-obs', '1');

      if (isInViewport(el)) {
        // Above the fold: enter on the next beat instead of waiting for an observer tick
        window.setTimeout(function () { revealImmediately(el); }, 90);
      } else {
        obs.observe(el);
      }
    });
  }

  /**
   * Re-init for newly added reveal elements
   */
  function refresh() {
    // Remove stale attribute from elements that might have been removed
    document.querySelectorAll('.reveal[data-reveal-obs]').forEach(el => {
      if (!document.body.contains(el)) {
        el.removeAttribute('data-reveal-obs');
      }
    });

    init();
  }

  /**
   * Manually reveal an element (for dynamically added content)
   */
  function reveal(el) {
    if (!el) return;
    if (prefersReducedMotion) {
      revealImmediately(el);
    } else {
      const obs = createObserver();
      if (!el.hasAttribute('data-reveal-obs')) {
        el.setAttribute('data-reveal-obs', '1');
        obs.observe(el);
      }
    }
  }

  // Listen for content updates
  document.addEventListener('portfolio:updated', () => {
    refresh();
  });

  // Listen for reduced motion changes
  const reducedMotionQuery = (getConfig() && getConfig().reducedMotion && getConfig().reducedMotion.prefers) 
    || '(prefers-reduced-motion: reduce)';
  if (window.matchMedia) {
    window.matchMedia(reducedMotionQuery).addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        // Reveal everything
        document.querySelectorAll('.reveal:not(.reveal-in)').forEach(el => {
          revealImmediately(el);
        });
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      } else {
        // Re-init
        refresh();
      }
    });
  }

  // Public API
  return {
    init,
    refresh,
    reveal,
    isReducedMotion: () => prefersReducedMotion,
  };
})();
