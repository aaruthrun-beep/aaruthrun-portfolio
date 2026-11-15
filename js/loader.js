/**
 * AARUTHRUN PORTFOLIO — MODULE LOADER
 * Dynamically loads all modules in dependency order.
 * Include this single script in new pages for full functionality.
 *
 * Usage: Include this ONE script in your HTML:
 *   <script src="js/loader.js"></script>
 *
 * Modules are loaded in this order:
 * 1. Config (AppConfig)
 * 2. Data Store (DataStore)
 * 3. Theme Manager
 * 4. Header Manager
 * 5. Footer Manager
 * 6. Reveal Manager
 * 7. Filter Manager
 * 8. Project Manager
 * 9. Timeline Manager
 * 10. Gallery Manager
 */

(function () {
  'use strict';

  const MODULES = [
    // Core (must load first)
    { src: 'config/app.config.js', global: 'AppConfig' },

    // Data layer
    { src: 'data/data-store.js', global: 'DataStore' },

    // UI Modules (depend on AppConfig and DataStore)
    { src: 'modules/theme/theme-manager.js', global: 'ThemeManager' },
    { src: 'modules/header/header-manager.js', global: 'HeaderManager' },
    { src: 'modules/footer/footer-manager.js', global: 'FooterManager' },
    { src: 'modules/reveal/reveal-manager.js', global: 'RevealManager' },

    // Feature Modules
    { src: 'modules/filters/filter-manager.js', global: 'FilterManager' },
    { src: 'modules/projects/project-manager.js', global: 'ProjectManager' },
    { src: 'modules/timeline/timeline-manager.js', global: 'TimelineManager' },
    { src: 'modules/gallery/gallery-manager.js', global: 'GalleryManager' },
  ];

  let loadedCount = 0;

  function loadModule(module, onLoad) {
    // Check if already loaded
    if (window[module.global]) {
      console.log(`[Loader] ${module.global} already loaded, skipping`);
      onLoad();
      return;
    }

    const script = document.createElement('script');
    script.src = module.src;
    script.async = false; // Load in order
    script.onload = () => {
      console.log(`[Loader] Loaded: ${module.global}`);
      loadedCount++;
      onLoad();
    };
    script.onerror = () => {
      console.error(`[Loader] Failed to load: ${module.src}`);
      onLoad(); // Continue anyway
    };

    document.head.appendChild(script);
  }

  function loadAll(onComplete) {
    let index = 0;

    function loadNext() {
      if (index >= MODULES.length) {
        console.log('[Loader] All modules loaded');
        if (onComplete) onComplete();
        return;
      }

      const module = MODULES[index];
      index++;

      // Check if already loaded
      if (window[module.global]) {
        console.log(`[Loader] ${module.global} already loaded`);
        loadNext();
        return;
      }

      loadModule(module, loadNext);
    }

    loadNext();
  }

  // Auto-start loading
  loadAll(() => {
    // Dispatch event that all modules are loaded
    document.dispatchEvent(new CustomEvent('portfolio:modules-ready'));
  });

  // Expose loader API
  window.ModuleLoader = {
    loadAll,
    getLoadedModules: () => MODULES.filter(m => window[m.global]),
    isLoaded: (name) => !!window[name],
  };

})();
