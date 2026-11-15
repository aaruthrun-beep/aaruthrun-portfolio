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

    // Apply initial theme
    applyTheme(getPreferredTheme());

    // No system preference listener — light is the hard default.

    return this;
  }

  /**
   * Update toggle button UI
   */
  function updateUI(theme) {
    if (!toggleIcon || !toggleLabel) return;

    if (theme === THEMES.DARK) {
      toggleIcon.textContent = '🌙';
      toggleLabel.textContent = 'DARK';
    } else {
      toggleIcon.textContent = '☀️';
      toggleLabel.textContent = 'LIGHT';
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
