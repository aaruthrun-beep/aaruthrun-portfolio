# -*- coding: utf-8 -*-
"""
make_media_folders.py — Creates organized media folders for the portfolio.

Generates:
  images/projects/<project-slug>/README.md   for all 8 projects in data/projects.json
  images/startup/avani-dynamics/README.md    for the Avani Dynamics startup page
  images/skills/{cad-fabrication,embedded-firmware}/README.md  for the skills page

Each README tells you exactly which pictures to add, suggested filenames,
and which already-existing flat image in images/ corresponds to that project.

Run from the repo root:  python tools/make_media_folders.py
Safe to re-run — it only creates folders/READMEs that are missing.
"""

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "projects.json"
IMAGES = ROOT / "images"

# Existing flat images in images/ mapped to their project slugs
EXISTING_FLAT = {
    "nite-369": "nite-369.webp",
    "mars-369": "mars-369.webp, mars-swarm-diagram.webp",
    "bldc-foc-actuator": "bldc-foc.webp",
    "ffb-steer-by-wire": "ffb-steer.webp",
    "esp32-s3-micro-robot": "esp32-robot.webp",
    "cat-autonomous-rover": "cat-rover.webp",
    "titan-klipper-corexy": "titan-klipper.webp",
    "scrapx6": "(none yet — new project)",
}


def project_readme(title: str, slug: str, summary: str) -> str:
    return f"""# {title} — Media Folder

This folder holds all pictures for the **{title}** project
(slug: `{slug}`, used by `data/projects.json` and the portfolio pages).

## What to add here

| Purpose | Suggested filename | Notes |
|---|---|---|
| Hero / main showcase shot | `hero.webp` | The money shot shown first on the project page |
| Build process photos | `build-01.webp`, `build-02.webp`, ... | CAD screenshots, 3D prints, wiring, CNC parts |
| Final assembled hardware | `final-01.webp`, `final-02.webp`, ... | Multiple angles of the finished machine |
| Close-up / detail shots | `detail-<part>.webp` | e.g. `detail-gearbox.webp`, `detail-pcb.webp` |
| Schematics / PCB layout | `schematic.webp`, `pcb.webp` | KiCAD renders or photos of boards |
| Demo / action shots | `demo-01.webp` ... | Robot in operation, screen recordings as `.mp4` |
| Milestone photos | `milestone-<n>.webp` | Match milestones listed in `data/projects.json` |
| Diagrams / kinematics | `diagram-<topic>.webp` | CAD exploded views, force diagrams, graphs |

## Conventions

- Prefer `.webp` (or `.jpg`) — the site loads these; keep individual files < 300 KB.
- Filenames are lowercase with hyphens, no spaces.
- If you add an `hero.webp`, the projects page can use it instead of the flat image.

## Already existing flat image for this project

`{EXISTING_FLAT.get(slug, '(none)')}` (currently lives flat in `images/`).
Once you populate this folder, those flat files can move here.

## Project summary

> {summary}
"""


def write_readme(folder: Path, content: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    readme = folder / "README.md"
    if not readme.exists():
        readme.write_text(content, encoding="utf-8")
        print(f"created  {readme.relative_to(ROOT)}")
    else:
        print(f"exists   {readme.relative_to(ROOT)}")


def main() -> None:
    projects = json.loads(DATA.read_text(encoding="utf-8"))
    for p in projects:
        slug = p.get("slug") or p.get("id")
        title = p.get("title", slug)
        summary = p.get("summary") or p.get("description", "")
        write_readme(IMAGES / "projects" / slug, project_readme(title, slug, summary))

    write_readme(
        IMAGES / "startup" / "avani-dynamics",
        """# Avani Dynamics — Media Folder

Pictures for the **Avani Dynamics** startup page (`startup.html`).

## What to add here

| Purpose | Suggested filename | Notes |
|---|---|---|
| Startup hero / branding shot | `hero.webp` | Machine or lab shot representing the venture |
| Robotics & autonomous systems | `robotics-01.webp` ... | Swarm robots, autonomous rovers, rovers in field |
| Actuation & mechanical design | `actuation-01.webp` ... | Cycloidal drives, FOC actuators, gear trains, CNC parts |
| Embedded systems & control | `embedded-01.webp` ... | PCBs, ESP32/STM32 boards, test benches, scope captures |
| Prototyping & R&D | `rnd-01.webp` ... | 48-hour sprint builds, bench testing, workshop shots |
| Team / lab photos | `lab-01.webp` ... | Workspace, machines, people working |
| Logo / OG image | `logo.webp`, `og-image.webp` | Site-wide branding (og-image currently flat in `images/`) |

## Conventions

- Prefer `.webp` (or `.jpg`); keep files < 300 KB; lowercase-hyphen filenames.
- Section images map to the four feature areas on `startup.html`:
  1. Robotics & Autonomous Systems
  2. Actuation & Mechanical Design
  3. Embedded Systems & Control
  4. Prototyping & R&D
""",
    )

    write_readme(
        IMAGES / "skills" / "cad-fabrication",
        """# Skills: CAD & Digital Fabrication — Media Folder

Pictures for the **CAD & DIGITAL FABRICATION** domain on `skills.html`.

## What to add here

| Purpose | Suggested filename | Notes |
|---|---|---|
| SolidWorks CAD models | `cad-<part>.webp` | e.g. `cad-cycloidal-drive.webp`, `cad-arm-assembly.webp` |
| GD&T / engineering drawings | `drawing-<part>.webp` | ASME Y14.5 drafting samples |
| CNC machining photos | `cnc-01.webp` ... | 6061/7075 aluminum parts, milling in progress |
| 3D printing photos | `print-<part>.webp` | PA-CF / carbon-fiber nylon CoreXY prints |
| FEA / simulation results | `fea-<study>.webp` | Stress validation, deformation plots |
| Fabricated end-use parts | `part-<name>.webp` | Finished machined gears, brackets, housings |
""",
    )

    write_readme(
        IMAGES / "skills" / "embedded-firmware",
        """# Skills: Embedded Systems & Firmware — Media Folder

Pictures for the **EMBEDDED SYSTEMS & FIRMWARE** domain on `skills.html`.

## What to add here

| Purpose | Suggested filename | Notes |
|---|---|---|
| PCB / board photos | `pcb-<board>.webp` | e.g. `pcb-foc-driver.webp`, `pcb-esp32-s3.webp` |
| Schematic captures | `schematic-<board>.webp` | KiCAD renders |
| Firmware / code screenshots | `firmware-<topic>.webp` | IDE views, FreeRTOS task listings |
| Scope / logic analyzer captures | `scope-<signal>.webp` | e.g. `scope-svpwm.webp`, `scope-can-bus.webp` |
| Test bench / rigs | `bench-01.webp` ... | Motor rigs, FOC test benches, wiring |
| Motion / control demos | `demo-<topic>.webp` | Steer-by-wire, haptic compliance, swarm meshes |
""",
    )

    print(f"\nAll media folders ready under {IMAGES.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
