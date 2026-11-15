# Aaruthrun — Robotics & Automation Portfolio

A multi-page, engineering-grade static portfolio website built for **Aaruthrun** (B.E. Robotics & Automation Engineering, PSG College of Technology; Diploma in Mechatronics Engineering).

Built with **pure semantic HTML5, Vanilla CSS, and Vanilla JavaScript**—zero heavy frameworks, zero build steps, and 100% deployable to GitHub Pages.

---

## 📐 Design System & Aesthetic Principles

- **Color Palette**:
  - Background: Pure White (`#FFFFFF`)
  - Primary Typography: `#111111`
  - Secondary / Body: `#666666`
  - Hairline Borders & Dividers: `#E5E5E5`
  - Single Accent: `#0057FF` (reserved for links, active indicators, and hover states only)
- **Typography**:
  - UI & Headings: `Inter` (system fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
  - Specifications, Dates, Code, & Tags: `JetBrains Mono` (system fallback: `'SF Mono', Consolas, monospace`)
- **Aesthetic Philosophy**:
  - Technical, minimal, Dieter Rams / Braun engineering precision.
  - **No gradients, no box-shadows, no decorative graphics.**
  - Hover transitions strictly capped at **150ms** (`transition: all 150ms ease`).
- **Layout**:
  - 1100px max width container, 12-column grid, 8px spacing scale (`8px, 16px, 24px, 32px, 48px, 64px`).
  - Sticky navigation bar with active page indicator.
  - Shared header and footer injected via `js/include.js` to eliminate markup duplication.

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
├── education.html          # Vertical timeline: B.E. at PSG Tech, Diploma, IndiaSkills
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

3. Save a 16:10 WebP graphic (e.g. `960x600px`) in the `images/` directory.
4. Refresh your browser! The project will automatically populate on:
   - `projects.html` (with filter support)
   - `project.html?slug=custom-drone-payload`
   - `timeline.html` (as a new swimlane with milestones)
   - `skills.html` (linked under each skill listed in the project)
   - `index.html` (if `featured: true`)

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
6. Click **Save**. Your site will be live at `https://aaruthrun-beep.github.io/portfolio/` within minutes!

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
