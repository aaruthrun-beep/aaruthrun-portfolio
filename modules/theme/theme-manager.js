/**
 * AARUTHRUN PORTFOLIO — THEME MANAGER MODULE
 * Handles light/dark theme with localStorage persistence and system preference.
 */

const ThemeManager = (function () {
  'use strict';

  // Private state
  const STORAGE_KEY = 'portfolio-theme';
  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
  };

  let currentTheme = THEMES.LIGHT;
  let observers = [];

  // DOM references (set after initialization)
  let toggleBtn = null;
  let toggleIcon = null;
  let toggleLabel = null;

  /* ------------------------------------------------------------------ */
  /* Floating control                                                   */
  /* ------------------------------------------------------------------ */

  // The footer button is only reachable once a reader has scrolled to the end of
  // a page, so a second control stays pinned to the bottom corner. It lives
  // here rather than in the footer module so every page that has a theme gets
  // it, and it carries its own styles so it cannot depend on a cached
  // stylesheet.
  const FLOAT_ID = 'theme-float-toggle';
  const FLOAT_STYLE_ID = 'theme-float-toggle-style';

  const FLOAT_CSS = [
    '#theme-float-toggle {',
    '  position: fixed;',
    '  right: 20px;',
    '  bottom: 20px;',
    '  z-index: 900;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 9px 14px;',
    '  font-family: var(--font-mono, ui-monospace, monospace);',
    '  font-size: 11px;',
    '  letter-spacing: 0.12em;',
    '  text-transform: uppercase;',
    '  color: var(--text-secondary, #4A514C);',
    '  background: var(--surface-subtle, #EDEAE4);',
    '  border: 1px solid var(--color-border, #D8DAD4);',
    '  border-radius: 999px;',
    '  box-shadow: 0 6px 20px rgba(20, 24, 23, 0.14);',
    '  cursor: pointer;',
    '  transition: color .2s ease, border-color .2s ease, transform .2s ease;',
    '}',
    '#theme-float-toggle:hover {',
    '  color: var(--color-accent, #315C9B);',
    '  border-color: var(--color-accent, #315C9B);',
    '  transform: translateY(-1px);',
    '}',
    '#theme-float-toggle:focus-visible {',
    '  outline: 2px solid var(--color-accent, #315C9B);',
    '  outline-offset: 2px;',
    '}',
    '#theme-float-toggle .theme-float-icon {',
    '  font-size: 12px;',
    '  line-height: 1;',
    '}',
    '@media (max-width: 600px) {',
    '  #theme-float-toggle { right: 12px; bottom: 12px; padding: 8px 12px; }',
    '}',
    '@media print {',
    '  #theme-float-toggle { display: none; }',
    '}',
  ].join('\n');

  /**
   * Get stored theme. Light is the hard default — no system preference fallback.
   * This ensures the portfolio always starts light for a clean engineering look.
   */
  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
      return stored;
    }
    // Hard default: always light
    return THEMES.LIGHT;
  }

  /**
   * Apply theme to document
   */
  function applyTheme(theme) {
    if (theme !== THEMES.DARK && theme !== THEMES.LIGHT) {
      console.warn('[ThemeManager] Invalid theme:', theme);
      return;
    }

    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Update UI if initialized
    updateUI(theme);

    // Notify observers
    notifyObservers(theme);
  }

  /**
   * Toggle between light and dark
   */
  function toggle() {
    const next = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    applyTheme(next);
  }

  /**
   * Get current theme
   */
  function getTheme() {
    return currentTheme;
  }

  /**
   * Check if dark mode
   */
  function isDark() {
    return currentTheme === THEMES.DARK;
  }

  /**
   * Initialize DOM references and event listeners
   */
  function init() {
    // Find theme toggle elements
    toggleBtn = document.getElementById('theme-toggle');
    toggleIcon = document.getElementById('toggle-icon');
    toggleLabel = document.getElementById('toggle-label');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    buildFloatingToggle();

    // Apply initial theme
    applyTheme(getPreferredTheme());

    // No system preference listener — light is the hard default.

    return this;
  }

  /**
   * Create the pinned control, once per page.
   */
  function buildFloatingToggle() {
    if (document.getElementById(FLOAT_ID)) return;

    if (!document.getElementById(FLOAT_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = FLOAT_STYLE_ID;
      style.textContent = FLOAT_CSS;
      document.head.appendChild(style);
    }

    const button = document.createElement('button');
    button.id = FLOAT_ID;
    button.type = 'button';
    button.innerHTML =
      '<span class="theme-float-icon" aria-hidden="true">☀️</span>' +
      '<span class="theme-float-label">LIGHT</span>';
    button.addEventListener('click', toggle);
    document.body.appendChild(button);
  }

  /**
   * Update toggle button UI
   */
  function updateUI(theme) {
    const dark = theme === THEMES.DARK;

    if (toggleIcon && toggleLabel) {
      toggleIcon.textContent = dark ? '🌙' : '☀️';
      toggleLabel.textContent = dark ? 'DARK' : 'LIGHT';
    }

    const floating = document.getElementById(FLOAT_ID);
    if (floating) {
      const icon = floating.querySelector('.theme-float-icon');
      const label = floating.querySelector('.theme-float-label');
      if (icon) icon.textContent = dark ? '🌙' : '☀️';
      if (label) label.textContent = dark ? 'DARK' : 'LIGHT';
      floating.setAttribute('aria-pressed', dark ? 'true' : 'false');
      floating.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  /**
   * Subscribe to theme changes
   */
  function onThemeChange(callback) {
    if (typeof callback === 'function') {
      observers.push(callback);
    }
    return () => {
      observers = observers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all observers
   */
  function notifyObservers(theme) {
    observers.forEach(cb => {
      try {
        cb(theme);
      } catch (error) {
        console.error('[ThemeManager] Observer error:', error);
      }
    });
  }

  // Auto-init if DOM ready
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Public API
  return {
    init,
    applyTheme,
    toggle,
    getTheme,
    isDark,
    onThemeChange,
    THEMES,
  };
})();
