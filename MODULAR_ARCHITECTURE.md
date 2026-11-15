# Aaruthrun Portfolio — Modular Architecture Guide

## Overview

The portfolio has been restructured from a collection of independent scripts into a modular, professionally-architected system. This document explains the architecture and how to work with it.

## Architecture Principles

1. **Separation of Concerns** — Each module has a single responsibility
2. **Encapsulation** — Modules use the Revealing Module Pattern with private state
3. **Loose Coupling** — Modules communicate via custom events, not direct dependencies
4. **Centralized Configuration** — All constants in `config/app.config.js` and `config/design-tokens.css`
5. **Data Abstraction** — All data access through `DataStore`, never direct fetch calls

## File Structure

```
/
├── config/
│   ├── app.config.js      # App-wide configuration (navigation, author, filters, etc.)
│   └── design-tokens.css  # Design system tokens (colors, spacing, typography)
│
├── data/
│   ├── projects.json      # Project data (unchanged)
│   └── data-store.js      # Data access layer with caching
│
├── modules/
│   ├── theme/             # Theme switching (light/dark)
│   ├── header/            # Header injection and navigation
│   ├── footer/            # Footer injection
│   ├── reveal/            # Scroll reveal animations
│   ├── filters/           # Project filtering logic
│   ├── projects/          # Project card/detail rendering
│   ├── timeline/          # Gantt chart timeline
│   └── gallery/           # Infinite canvas gallery
│
├── styles/
│   ├── base.css           # CSS reset, base styles
│   ├── layout.css         # Container, grid, header, footer
│   ├── components.css     # Buttons, cards, tags, forms
│   ├── typography.css     # Type scales, utilities
│   ├── animations.css     # Reveal animations, transitions
│   └── utilities.css      # Utility classes (flex, spacing, etc.)
│
├── js/
│   ├── app.js             # Main bootstrapper (initializes all modules)
│   ├── loader.js          # Dynamic module loader (for flexible loading)
│   └── include.js         # Legacy compatibility layer
│
└── HTML pages (index.html, projects.html, etc.)
```

## Module API Reference

### AppConfig (Global)
Centralized configuration object. All modules import this.

```javascript
// Access config
const nav = AppConfig.getNav();
const author = AppConfig.getAuthor();
const filters = AppConfig.getFilters();
```

### DataStore
Data access layer with automatic caching.

```javascript
// Fetch projects (cached for 5 minutes)
const projects = await DataStore.getProjects();

// Find by slug
const project = DataStore.findProjectBySlug('nite-369');

// Filter
const filtered = DataStore.filterProjects({
  tags: ['Robotics'],
  statuses: ['Active'],
  search: 'robot'
});
```

### ThemeManager
Light/dark theme switching with localStorage persistence.

```javascript
ThemeManager.init();           // Initialize (auto-called)
ThemeManager.toggle();         // Toggle theme
ThemeManager.applyTheme('dark'); // Force theme
ThemeManager.getTheme();       // Get current theme
ThemeManager.onThemeChange(cb); // Subscribe to changes
```

### HeaderManager
Injects and manages the site header.

```javascript
HeaderManager.init();   // Initialize (auto-called)
HeaderManager.render(); // Re-render header
HeaderManager.refresh(); // Update current page
```

### FooterManager
Injects the site footer.

```javascript
FooterManager.init();   // Initialize (auto-called)
FooterManager.render(); // Re-render footer
```

### RevealManager
Scroll-triggered reveal animations via IntersectionObserver.

```javascript
RevealManager.init();        // Initialize (auto-called)
RevealManager.refresh();     // Re-scan for new elements
RevealManager.reveal(el);    // Manually reveal element
RevealManager.isReducedMotion(); // Check reduced motion preference
```

### FilterManager
Project filtering logic (decoupled from UI).

```javascript
// Create filter instance
const filter = FilterManager.create({
  items: projects,
  onFilterChange: (filtered, state) => { /* render */ }
});

filter.setTag('Robotics');
filter.setStatus('Active');
filter.reset();
filter.getState();
```

### ProjectManager
Renders project cards, grids, and detail views.

```javascript
ProjectManager.renderProjectCard(project, isLCP);
ProjectManager.renderGrid(gridEl, projects);
ProjectManager.renderProjectDetail(project, allProjects);

// Page initialization (auto-called based on current page)
ProjectManager.initFeaturedSection();  // Home page
ProjectManager.initArchivePage();      // Projects page
ProjectManager.initDetailPage();       // Project detail page
ProjectManager.initSkillsPage();       // Skills page
```

### TimelineManager
Gantt chart timeline visualization.

```javascript
// Auto-initialized on timeline.html and mini timeline on home
TimelineManager.init();
```

### GalleryManager
Infinite canvas gallery with pan/zoom.

```javascript
GalleryManager.init();     // Initialize (auto-called)
GalleryManager.fitToScreen();
GalleryManager.zoomIn();
GalleryManager.zoomOut();
```

## Event System

Modules communicate via custom events dispatched on `document`:

| Event | Payload | Triggered By |
|-------|---------|--------------|
| `portfolio:updated` | none | When content is updated (reveal re-scan) |
| `portfolio:page-change` | none | When page changes |
| `portfolio:modules-ready` | none | When all modules loaded |
| `portfolio:filter-change` | `{ activeTag, activeStatus, filtered, total, visible }` | FilterManager |
| `portfolio:filter-reset` | none | When filters reset |

Example:
```javascript
document.addEventListener('portfolio:filter-change', (e) => {
  console.log('Filter changed:', e.detail);
});
```

## Adding a New Page

1. Create HTML with proper structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title — Aaruthrun</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <!-- Header placeholder -->
  <header id="site-header"></header>
  
  <main id="main-content">
    <div class="container">
      <!-- Your page content here -->
    </div>
  </main>
  
  <!-- Footer placeholder -->
  <footer id="site-footer"></footer>
  
  <!-- Scripts -->
  <script src="config/app.config.js"></script>
  <script src="data/data-store.js"></script>
  <script src="modules/theme/theme-manager.js"></script>
  <script src="modules/header/header-manager.js"></script>
  <script src="modules/footer/footer-manager.js"></script>
  <script src="modules/reveal/reveal-manager.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

2. If the page needs project data, add the project manager:
```html
<script src="modules/filters/filter-manager.js"></script>
<script src="modules/projects/project-manager.js"></script>
```

3. If the page has its own module, add it before app.js:
```html
<script src="modules/my-module/my-manager.js"></script>
<script src="js/app.js"></script>
```

## Styling

### Using Design Tokens

All visual constants are CSS custom properties defined in `config/design-tokens.css`:

```css
/* Colors */
background-color: var(--color-bg);
color: var(--color-text-main);
border: 1px solid var(--color-border);

/* Spacing (8px scale) */
padding: var(--space-3);  /* 24px */
margin-bottom: var(--s-2); /* 16px */

/* Typography */
font-size: var(--text-xl);  /* 16px */
font-family: var(--font-mono);
line-height: var(--leading-relaxed);

/* Transitions */
transition: all var(--transition-base); /* 150ms ease */
```

### Using Utility Classes

```html
<!-- Flexbox -->
<div class="flex justify-between align-center gap-2">
  <div class="flex-1">Left</div>
  <div class="flex-1">Right</div>
</div>

<!-- Spacing -->
<div class="p-3 m-b-4">Content with padding and margin</div>

<!-- Typography -->
<h1 class="text-4xl font-semibold">Heading</h1>
<p class="text-md text-secondary">Body text</p>
<span class="mono text-sm text-muted">Monospace label</span>

<!-- Visibility -->
<div class="hide-mobile">Only on desktop</div>
<div class="show-mobile">Only on mobile</div>
```

## Migration Guide (Legacy → Modular)

### Before (Legacy)
```html
<script src="js/include.js"></script>
<script src="js/filters.js"></script>
<script src="js/projects.js"></script>
```

```javascript
// Direct DOM manipulation, global state
const projects = await fetch('./projects.json');
```

### After (Modular)
```html
<script src="config/app.config.js"></script>
<script src="data/data-store.js"></script>
<script src="modules/theme/theme-manager.js"></script>
<script src="modules/header/header-manager.js"></script>
<script src="modules/footer/footer-manager.js"></script>
<script src="modules/reveal/reveal-manager.js"></script>
<script src="modules/filters/filter-manager.js"></script>
<script src="modules/projects/project-manager.js"></script>
<script src="js/app.js"></script>
```

```javascript
// Use DataStore for data
const projects = await DataStore.getProjects();

// Use modules for functionality
const filter = FilterManager.create({ items: projects, onFilterChange: render });
ThemeManager.onThemeChange(theme => console.log('Theme:', theme));
```

## Best Practices

1. **Always use DataStore** — Never fetch projects.json directly
2. **Use AppConfig** — Never hardcode site metadata, navigation, etc.
3. **Dispatch events, don't call modules directly** — Loose coupling
4. **Use CSS custom properties** — Never hardcode colors, spacing
5. **Initialize in correct order** — Config → Data → Theme → UI → Features

## Troubleshooting

### Module not loading
Check browser console for script load errors. Ensure paths are correct relative to HTML file.

### Theme not persisting
Check localStorage. Theme is stored under key `portfolio-theme`.

### Reveal animations not working
Ensure elements have `.reveal` class and are inside a container that's observed.

### Filters not working
Ensure FilterManager is initialized with items array. Check that filter events are properly handled.

## Future Improvements

- [ ] Convert remaining HTML pages to use new module structure
- [ ] Add unit tests for modules
- [ ] Implement service worker for offline support
- [ ] Add lazy loading for below-fold images
- [ ] Create build process for CSS bundling and minification
