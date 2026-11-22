# Aaruthrun — Robotics & Automation Portfolio

A multi-page, engineering-grade static portfolio website built for **Aaruthrun** (B.E. Robotics & Automation Engineering, PSG College of Technology; Diploma in Mechatronics Engineering).

Built with **pure semantic HTML5, Vanilla CSS, and Vanilla JavaScript**—zero heavy frameworks, zero build steps, and 100% deployable to GitHub Pages.

---

## 📐 Design System & Aesthetic Principles

- **Colour palette** (defined in `config/design-tokens.css`):
  - Background: warm off-white `#F0EFE9`
  - Primary typography: `#202522`
  - Secondary text: `#737B78` (the archive uses `#5D6561` for long reading)
  - Hairline borders: `#D8DAD4`
  - Single accent: muted cobalt `#315C9B`
- **Typography**:
  - Display headings: `Instrument Serif`
  - Body & UI: `Inter`
  - Specifications, dates, code & tags: `JetBrains Mono`
- **Aesthetic philosophy**:
  - Technical, minimal, editorial engineering archive.
  - **No gradients, no glassmorphism, no decorative graphics.**
  - Motion is quiet and purposeful; image settles use a longer easing than UI hovers.
- **Layout**:
  - 920–1240px containers depending on page, 8px spacing scale.
  - Sticky navigation bar with active page indicator.
  - Shared header and footer injected via the modules in `modules/header/` and `modules/footer/`.

---

## 🗂️ Site Map & Directory Structure

```
portfolio-2/
├── index.html              # Home/About: about + bio (top), timeline preview, featured projects, achievements, focus areas
├── about.html              # Redirects to the About section on index.html
├── projects.html           # Filterable project grid (domain tags & status filters)
├── project.html            # Detail template dynamically rendered from projects.json (?slug=...)
├── timeline.html           # Concurrent project timeline (swimlanes Gantt in SVG)
├── skills.html             # Skills matrix grouped by domain, cross-linking projects
├── startup.html            # Avani Dynamics venture page (MARS 369 swarm robot, roadmap)
├── education.html          # Vertical timeline: B.E. at PSG Tech, Diploma, training
├── contact.html            # Direct email, copy button, GitHub, LinkedIn, inquiry form
├── projects.json           # Single source of truth datastore for all projects
├── generate_images.py      # Script generating 16:10 technical engineering WebP drawings
├── css/
│   └── style.css           # Complete design system stylesheet
├── js/
│   ├── include.js          # Injects shared header and footer, active link highlighting
│   ├── projects.js         # Loads projects.json, renders archive, detail view, & skills
│   ├── timeline.js         # Interactive SVG Gantt chart (zoom, overlap hover, tooltips)
│   └── filters.js          # Generic multi-attribute filter manager
├── data/
│   └── projects.json       # Mirror copy of projects datastore
└── images/                 # 16:10 technical WebP schematics
    ├── nite-369.webp
    ├── mars-369.webp
    ├── bldc-foc.webp
    ├── ffb-steer.webp
    ├── esp32-robot.webp
    ├── cat-rover.webp
    ├── titan-klipper.webp
    ├── mars-swarm-diagram.webp
    ├── avatar.webp
    └── og-image.webp
```

---

## 🛠️ How to Add a New Project

All project data lives in `projects.json` (and `data/projects.json`). To add a new build:

1. Open `projects.json`.
2. Append a new project object to the array following this schema:

```json
{
  "id": 8,
  "slug": "custom-drone-payload",
  "title": "Hexacopter Gimbal Payload — Active 3-Axis Stabilizer",
  "shortTitle": "Hexacopter Gimbal",
  "category": "Robotics",
  "start": "2026-02",
  "end": null,
  "status": "Active",
  "featured": true,
  "tags": ["Robotics", "Control", "Embedded"],
  "skills": ["Field Oriented Control", "STM32", "SolidWorks", "IMU Sensor Fusion"],
  "summary": "Brushless 3-axis camera gimbal with direct-drive FOC actuators and real-time IMU stabilization.",
  "monoSpec": "3-Axis // FOC Direct-Drive // 32-bit ARM // <0.02° Jitter",
  "image": "images/hexacopter-gimbal.webp",
  "specs": {
    "Degrees of Freedom": "3-Axis (Pitch, Roll, Yaw)",
    "Motor Drives": "4008 Brushless Gimbal Motors",
    "Encoder": "14-bit AS5048A over SPI",
    "Loop Frequency": "1000 Hz Quaternion Attitude Filter"
  },
  "milestones": [
    {
      "date": "2026-02",
      "type": "prototype",
      "label": "Gimbal CAD & Balancing Mass",
      "description": "Calculated center-of-gravity offsets for payload camera in SolidWorks."
    },
    {
      "date": "2026-04",
      "type": "demo",
      "label": "First Stable Horizon Lock",
      "description": "Demonstrated active disturbance rejection under manual shake rig."
    }
  ],
  "problem": "Commercial gimbals lack custom serial telemetry pass-through...",
  "architecture": "A central STM32F4 queries the IMU at 1 kHz and commands FOC phase angles...",
  "mechanical": "Carbon fiber tube arms with CNC aluminum 6061 clamps...",
  "electronicsFirmware": "Custom 36mm round motor driver boards with DRV8313 drivers...",
  "control": "Cascaded rate-gyro PI and angle P loops with dynamic cross-coupling rejection...",
  "results": "Horizon drift remained under 0.05° over 15 minutes of continuous flight...",
  "buildLog": [
    {"date": "2026-02-12", "entry": "Machined pitch arm from 6061 aluminum plate."}
  ],
  "repo": "https://github.com/aaruthrun-beep/hexacopter-gimbal",
  "video": "https://youtube.com/watch?v=gimbal-demo",
  "links": [
    {"label": "GitHub Firmware Repository", "url": "https://github.com/aaruthrun-beep/hexacopter-gimbal"}
  ],
  "images": [
    "images/hexacopter-gimbal.webp"
  ]
}
```

3. Save the cover photograph at the path named in `image`, and any additional photographs under `images/projects/<slug>/` for the media grid.
4. Regenerate the web-sized derivatives:
   ```bash
   powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-archive-images.ps1
   ```
   This writes `images/archive/<slug>.jpg` and `<slug>-thumb.jpg` and links them through `archiveImage` / `thumbImage`.
5. Refresh your browser. The project will appear on:
   - `projects.html` — featured if it has a `featuredRank`, otherwise in the compact listing
   - `project.html?slug=custom-drone-payload`
   - `timeline.html` as a swimlane plus dated ledger entries
   - `skills.html` for every skill listed in `data/skills.json` that references its slug
   - `index.html` only when it is curated in `data/home.json`

### Featured vs. other projects

The archive uses two explicit editorial tiers. `data/projects.json` carries `featuredRank` (1 = most prominent) on the projects shown as large alternating rows; every project without a rank appears in the compact **Other projects** listing with its date range, status and tags. Filters apply across both tiers and a group disappears when it has no matches. Increase or remove a rank to change the hierarchy — no template changes are needed.

---

## 🖼️ Gallery Map (Project Circles)

`gallery.html` draws one hand-drawn circle per project. Each project's photos sit inside it at **full resolution — never scaled down** — scattered at random and never overlapping. Files below `minPhotoEdge` (default 2400 px on the long edge, capped at 3× in `config/app.config.js`) are shown larger so a low-resolution phone photo doesn't read as a speck next to a 4K one; the originals are untouched. The circles space themselves apart, so a photo dropped into one folder only grows that circle and nudges its neighbours.

**Adding photos** — drop any `.jpg`, `.jpeg`, `.png`, `.webp` or `.gif` into `images/projects/<slug>/`, then rebuild the map:

```bash
npm run gallery        # build data/gallery.json once
npm run gallery:watch  # rebuild automatically while you work
```

Photos are packed as rotated rectangles (separating axis test, ±6° tilt), each placed at the best of 60 random spots nearest the cluster centre, then compacted inward and the circle is shrink-wrapped to the outermost corner. The build reads each file's real dimensions (no resizing or re-encoding), reuses the previous placements from `data/gallery.json` so existing photos keep their positions, and re-flows the project circles. Packing knobs — `pad`, `density`, `candidates`, `jitter`, `maxRot`, `compact`, `projectGap` — live in `config/app.config.js`.

Every photo is drawn as a **Polaroid print**: the frame is added around the image, which keeps its natural pixel size, and the layout packs the framed box. Caption and date come from the first source that has them:

1. a sidecar `project.json` in the photo's folder — `{ "captions": { "IMG_0412.jpg": { "text": "first drive test", "date": "2026-03-15" } } }`
2. the filename — `2026-03-15__first-drive-test.jpg`, or a bare date such as `IMG_20260315_142530.jpg` / `PXL_20260315_…` / `WhatsApp … 2026-03-15 …`
3. EXIF `DateTimeOriginal` (needs `exifr`; without it the build still runs and simply skips this step)
4. blank — the file's modification time is deliberately never used, since that is the copy date, not the shot date.

The frame geometry (`sideRatio`, `minSide`, `bottomMult`) lives in `tools/gallery-layout.mjs`; it is hashed into the manifest, so changing it rebuilds the layout. A folder that is not listed in `data/projects.json` still becomes a circle, titled from its folder name; `data/projects.json` continues to supply the titles, dates and metadata used elsewhere on the site.

---

## 🔗 Shareable project and field-note pages

`project.html` and `journal-entry.html` render in the browser, so their `<head>` metadata only exists once JavaScript runs — invisible to the crawlers that build link previews. `tools/build-pages.mjs` bakes one real page per project and per published field note from the same templates and data:

```bash
npm run pages          # regenerate after editing data/projects.json or data/journal.json
npm run pages:check    # exit 1 when a page is missing or out of date
```

It writes `project-<slug>.html` and `journal-<slug>.html` beside the templates with:

- `<title>`, description, canonical, and Open Graph/Twitter tags for that build or note
- an absolute `og:image` taken from the web-sized `images/archive/` derivative, never the multi-megabyte original
- `TechArticle` / `BlogPosting` structured data
- `data-page` / `data-slug` on `<body>`, so the usual renderer takes over on load
- a `<noscript>` summary of the page

Everything else — stylesheets, scripts, cache-busting versions — comes from `project.html` and `journal-entry.html`, so the generated pages never drift from the real ones. If you edit those two templates, keep the `<!-- build-pages:meta:start -->` / `<!-- build-pages:meta:end -->` markers around the head block.

Absolute URLs come from `SITE.url` in `config/app.config.js`; pass `--base-url=https://example.com/base` to build for a fork or a preview deploy. Pages whose project or note has been removed are cleaned up on the next build.

---

## ⏱️ How to Edit Timeline & Milestone Data

In `projects.json`:

- **Project Date Range**:
  - `"start": "2024-03"` (format: `YYYY-MM`)
  - `"end": "2024-11"` (for completed projects)
  - `"end": null` (for ongoing / active projects; the timeline automatically renders an open-ended forward arrow `→`).
- **Milestone Diamonds**:
  - Add or edit items inside `"milestones": [...]`.
  - Date format: `"YYYY-MM"`.
  - Type: `"prototype"`, `"competition"`, `"publish"`, or `"demo"`.
  - The SVG Gantt chart in `timeline.html` dynamically positions a diamond `◆` at that exact month and attaches a hover tooltip with your label and description.
- **Concurrent Overlap Interaction**:
  - When you hover over any project bar in `timeline.html`, `js/timeline.js` automatically computes mathematical overlap with all other project date ranges and highlights concurrent projects while dimming non-overlapping ones.

---

## 💻 Local Development

Because the site fetches `projects.json` via native browser `fetch()`, run any local static HTTP server:

### Option A: Python (Standard)
```bash
python -m http.server 8000
```
Then visit: `http://localhost:8000`

### Option B: Node.js (npx serve)
```bash
npx serve .
```

### Option C: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

---

## 🚀 Deployment to GitHub Pages

1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Aaruthrun Robotics Portfolio"
   ```
2. Push to your GitHub repository:
   ```bash
   git remote add origin https://github.com/aaruthrun-beep/portfolio.git
   git branch -M main
   git push -u origin main
   ```
3. In GitHub, navigate to **Settings > Pages**.
4. Under **Build and deployment > Source**, select **Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`.
6. Click **Save**. Your site will be live at `https://aaruthrun-beep.github.io/aaruthrun-portfolio/` within minutes!

---

## ⚡ Performance & Accessibility (Lighthouse 95+)

- **Zero Bundler / Zero Framework overhead**: Instant page loads, zero runtime script compilation.
- **Modern Web Guidance**:
  - Critical LCP hero images prioritized with `fetchpriority="high"`.
  - Below-the-fold project images loaded asynchronously with `loading="lazy"` and `decoding="async"`.
  - Explicit `width` and `height` dimensions prevent Cumulative Layout Shifts (CLS).
- **Accessibility (WCAG AA)**:
  - Contrast ratios exceed 4.5:1 (`#111111` on `#FFFFFF` is 16.5:1).
  - Semantic HTML5 structure (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`).
  - Screen reader skip link (`.skip-link`).
  - High-visibility keyboard navigation outline (`:focus-visible`).

---

## 🧱 Content Architecture (Journal, Skills, Timeline, Homepage)

The site is still static: each content file is fetched at runtime through `data/content-store.js` and rendered by a small module. No build step is required to publish writing.

### `data/journal.json` — field notes

The archive currently ships with eight published entries. Add or edit entries in the `entries` array; the index, search, featured note, archive statistics and homepage teaser all update from this file without editing a page.

```json
{
  "schemaVersion": 2,
  "entries": [
    {
      "slug": "foc-current-loop-tuning",
      "title": "Tuning the current loop on the BLDC actuator",
      "subtitle": "The deck that appears under the article title.",
      "date": "2026-04-18",
      "category": "Motor Control",
      "project": "bldc-foc-actuator",
      "cover": "images/archive/bldc-foc-actuator.jpg",
      "thumb": "images/archive/bldc-foc-actuator-thumb.jpg",
      "coverAlt": "BLDC FOC actuator on the bench",
      "coverCaption": "Optional cover caption.",
      "author": "Aaruthrun",
      "featured": false,
      "summary": "One sentence that appears in the archive and on the homepage.",
      "tags": ["FOC", "STM32"],
      "status": "published",
      "blocks": [
        { "type": "paragraph", "text": "Context and what was on the bench." },
        { "type": "heading", "level": 2, "text": "Attempt one" },
        { "type": "image", "src": "images/projects/bldc-foc-actuator/scope.jpg", "caption": "Current loop step response." },
        { "type": "table", "head": ["Setting", "Value"], "rows": [["Bandwidth", "—"]], "caption": "Measured values" },
        { "type": "code", "language": "c", "filename": "current_loop.c", "code": "// excerpt" },
        { "type": "references", "items": [{ "label": "Datasheet", "url": "https://example.com" }] }
      ]
    }
  ]
}
```

Supported block types: `paragraph`, `heading` (level 2–3), `list` (`ordered`, `items`), `image`, `image-grid`, `table` (`head`, `rows`, `caption`), `code` (`language`, `filename`, `code`), `callout` (`title`, `text`), `quote` (`text`, `attribution`), `video` (`url`, `title`), `references` (`items[]` with `label`/`url`/`note`), and `divider`. All text is escaped by `modules/content/blocks.js`; code blocks support lightweight C, C++, Python and JavaScript syntax highlighting.

- Only entries with `status: "published"` are rendered; draft or review entries never appear on the index, article routes or homepage.
- The latest entry with `featured: true` becomes the featured note automatically. If none is featured, the latest published note is used.
- Search covers titles, subtitles, summaries, categories, tags and project names. Category filters and Load More run client-side without a page reload.
- Reading time is calculated from the entry text unless `readingTime` is provided explicitly.
- Article headings are collected into a table of contents; every article has a permanent `journal-entry.html?slug=...` address and a canonical link.
- Related projects resolve through `project` (a slug) and link to the project documentation. For a project that is not yet in `data/projects.json`, set `projectLabel` and optional `projectUrl` on the entry; the reference will still render without inventing a project page. The `v-plotter`, `itms` and `agri-robotics` slugs have display aliases ready for that case.
- The journal index shows a designed empty state if no entries are published.
- `journal-entry.html?template=1` previews every block type without pretending to be published content.

### `data/skills.json` — disciplines and evidence

```json
{
  "categories": [
    { "id": "embedded", "title": "Embedded systems",
      "items": [ { "name": "Motor control", "projects": ["bldc-foc-actuator"] } ] }
  ]
}
```

Only list projects where the capability is already documented. An empty `projects` array renders as “No project linked yet” rather than a proficiency score. Category `id` values are the anchor targets used by the homepage skill rows.

### `data/timeline.json` — awards, papers, education

```json
{
  "events": [
    { "date": "2025", "dateLabel": "2025 — 2028", "type": "Education",
      "title": "B.E. Robotics & Automation Engineering", "detail": "PSG College of Technology", "link": "education.html" }
  ]
}
```

`date` is optional. Leave it `null` and set `dateLabel` to `"Date not recorded"` when the date is unknown; the ledger keeps it in the undated group rather than guessing. Dated project milestones come automatically from `projects.json`.

### `data/home.json` — homepage curation

- `bench.status` selects the project status shown under **Currently on the bench** (`"Active"` by default). Missing `currentFocus` / `updated` values render as explicit placeholders.
- `selected` is the ordered list of `Featured work` slugs and their web-sized photographs. Reorder it to change the homepage; the archive hierarchy is controlled separately by `featuredRank`.

### Pages and modules

| Page | Purpose | Renderer |
|---|---|---|
| `journal.html` / `journal-entry.html` | Journal index, article reading view, template preview | `modules/journal/journal-manager.js` |
| `skills.html` | Five-discipline matrix linked to projects | `modules/skills/skills-index.js` |
| `timeline.html` | Gantt plus milestone ledger | `modules/timeline/timeline-ledger.js` |
| `projects.html` | Featured rows + compact archive, filters | `modules/projects/project-archive.js` |
| `project.html` | Eight-section documentation template | `modules/projects/project-detail-renderer.js` |
| `index.html` | Bench, selected work, journal teaser, skills | `modules/home/home-platform.js` |

Image derivatives: `tools/make-archive-images.ps1` creates archive and thumbnail copies; `tools/make-selected-images.ps1` creates the three homepage selected-work photographs. Originals in `images/projects/` are never modified.
