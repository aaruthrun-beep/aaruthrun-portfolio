# Aaruthrun Portfolio — Professional Engineering Architecture

## Architecture Overview

This portfolio has been restructured into a modular, globally-configured engineering project following professional software architecture patterns.

### Directory Structure

```
/
├── config/                  # Centralized configuration
│   ├── app.config.js        # Application metadata, URLs, constants
│   └── design-tokens.css    # Design system tokens (colors, spacing, typography)
├── data/                    # Data layer
│   ├── projects.json        # Project datastore (normalized)
│   └── data-store.js        # Data access layer with caching
├── modules/                 # Feature modules ( decoupled )
│   ├── theme/               # Theme manager module
│   ├── header/              # Header component module
│   ├── footer/              # Footer component module
│   ├── projects/            # Project rendering module
│   ├── timeline/            # Timeline/Gantt module
│   ├── gallery/             # Gallery canvas module
│   ├── filters/             # Filter utility module
│   ├── reveal/              # Scroll reveal animation module
│   └── router/              # Simple client-side router
├── components/              # Reusable UI component templates
│   └── component-templates.js
├── styles/                  # Stylesheets (modular)
│   ├── base.css             # CSS reset, base styles
│   ├── layout.css           # Grid, container, section layouts
│   ├── components.css       # Buttons, cards, tags, forms
│   ├── typography.css       # Font faces, type scales
│   ├── animations.css       # Reveal animations, transitions
│   └── utilities.css        # Utility classes
├── js/                      # Legacy/entry scripts (thin wrappers)
│   ├── app.js               # Main application bootstrapper
│   └── ... (legacy files maintained for compatibility)
├── index.html               # Home page
├── projects.html            # Project archive
├── project.html             # Project detail template
├── timeline.html            # Timeline/Gantt page
├── gallery.html             # Infinite canvas gallery
├── skills.html              # Skills matrix
├── contact.html             # Contact page
├── startup.html             # Startups page
├── blog.html                # Blog
├── education.html           # Education & credentials
└── css/style.css            # Legacy - now imports modular styles
```

### Module Architecture

Each module follows the **Revealing Module Pattern** with:
- **Encapsulated state** — private variables, public API only
- **Explicit dependencies** — modules declare what they need
- **Event-driven communication** — modules communicate via custom events, not direct coupling
- **Lazy initialization** — modules init only when needed

### Data Flow

```
projects.json → DataStore (cache) → Modules (consume data)
                    ↓
              Event Bus (portfolio:updated, portfolio:project-selected, etc.)
                    ↓
              UI Components (render)
```

### Design Tokens

All visual constants are centralized in `config/design-tokens.css` as CSS custom properties, enabling:
- Consistent spacing, colors, typography across all pages
- Theme switching (light/dark) via `data-theme` attribute
- Easy redesign by changing tokens in one place

### Bootstrap Flow

1. `app.js` loads → reads config → applies theme
2. Theme module initializes → listens for toggle events
3. Header/Footer modules inject shared components
4. Page-specific modules initialize based on page detection
5. DataStore fetches and caches projects.json
6. Reveal module sets up IntersectionObserver for animations

### Cross-Page Consistency

All pages share:
- Same header (nav, brand, theme toggle)
- Same footer (links, bio, Tesla quote)
- Same design tokens (colors, spacing, typography)
- Same reveal animation system
- Same filter/tag UI patterns

### Key Improvements

| Before | After |
|--------|-------|
| Global variables in IIFEs | Encapsulated modules with public APIs |
| Duplicated nav/footer HTML | Single component modules inject everywhere |
| Inline styles scattered | Design tokens + utility classes |
| Hardcoded paths/URLs | Centralized config |
| No data caching | DataStore with in-memory cache |
| Modules coupled to DOM | Modules communicate via events |
| No lazy loading | Modules init on demand |

### Adding a New Page

1. Create HTML with `<header id="site-header"></header>` and `<footer id="site-footer"></footer>`
2. Link `js/app.js` (which loads config, theme, header, footer automatically)
3. Link page-specific module(s) from `modules/`
4. Add page config to `config/app.config.js` if needed
