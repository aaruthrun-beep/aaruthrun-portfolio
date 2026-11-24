/**
 * LAYOUT ENGINE - project circles
 *
 * Pure functions, no DOM and no dependencies.
 *
 * Inside a project, photos are packed as rotated rectangles tested with the
 * separating axis theorem, so the empty corners of a circumscribed disc no
 * longer count as occupied. Each photo tries `candidates` random spots and
 * takes the one nearest the cluster centre; a compaction pass then slides
 * everything inward until it locks, and the circle is shrink-wrapped to the
 * outermost corner. Existing placements are reused, so adding a photo only
 * slides that photo into a gap and grows the circle if it must.
 *
 * Between projects, circles are pushed apart until the gaps are even and the
 * arrangement is scaled so the tightest pair just meets `projectGap`.
 */

const FALLBACK = {
  pad: 6,
  density: 0.75,
  candidates: 60,
  jitter: 0.1,
  maxRot: 6,
  compact: 40,
  projectGap: 240,
  clusterMargin: 900,
};

// Bump when the packing rules change: a manifest from an older version is
// treated as missing, which triggers one full repack.
export const LAYOUT_VERSION = 3;

/* Polaroid frame. The photo keeps its natural size; the frame is added
   around it and the layout packs the framed box. The bottom strip is a
   multiple of the side border, so every print looks like a print. */
export const FRAME = { sideRatio: 0.045, minSide: 10, bottomMult: 3.6 };

export function frameOf(w, h, c = FRAME) {
  const side = Math.round(Math.max(c.minSide, w * c.sideRatio));
  const bottom = Math.round(side * c.bottomMult);
  return { side, top: side, bottom, W: w + 2 * side, H: h + side + bottom };
}

// Changing the frame changes every framed box, so old placements are void.
export function frameHash(c = FRAME) {
  return hashSeed(`${c.sideRatio}:${c.minSide}:${c.bottomMult}`);
}

export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const round = (n, places) => {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* ------------------------------------------------------------------ */
/* Rotated rectangle geometry                                          */
/* ------------------------------------------------------------------ */

function cornersOf(item) {
  const a = (item.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = item.w / 2;
  const hh = item.h / 2;
  const local = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return local.map(([x, y]) => ({
    x: item.x + x * c - y * s,
    y: item.y + x * s + y * c,
  }));
}

function axesOf(item) {
  const a = (item.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    { x: -s, y: c },
    { x: c, y: s },
  ];
}

function projectPoints(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

// True when the two rotated rectangles are at least `pad` apart. SAT gives
// the closest face-normal direction; requiring the gap along it keeps every
// rectangle clear without inflating it into a disc.
function apart(a, b, pad) {
  const A = cornersOf(a);
  const B = cornersOf(b);
  const axes = axesOf(a).concat(axesOf(b));

  for (const axis of axes) {
    const pa = projectPoints(A, axis);
    const pb = projectPoints(B, axis);
    const gap = Math.max(pb[0] - pa[1], pa[0] - pb[1]);
    if (gap >= pad) return true;
  }
  return false;
}

function insideCircle(item, radius) {
  for (const p of cornersOf(item)) {
    if (Math.hypot(p.x, p.y) > radius + 1e-6) return false;
  }
  return true;
}

function fits(item, others, radius, pad) {
  if (!insideCircle(item, radius)) return false;
  for (const other of others) {
    if (!apart(item, other, pad)) return false;
  }
  return true;
}

function radiusOf(items) {
  let outer = 0;
  for (const item of items) {
    for (const p of cornersOf(item)) {
      const d = Math.hypot(p.x, p.y);
      if (d > outer) outer = d;
    }
  }
  return Math.ceil(outer) + 8;
}

function centroidOf(items) {
  let x = 0;
  let y = 0;
  for (const item of items) {
    x += item.x;
    y += item.y;
  }
  return { x: x / items.length, y: y / items.length };
}

function estimateRadius(items, cfg) {
  let area = 0;
  let reach = 0;
  for (const item of items) {
    area += item.w * item.h;
    reach = Math.max(reach, Math.hypot(item.w, item.h) / 2);
  }
  return Math.max(reach, Math.sqrt(area / (Math.PI * cfg.density)));
}

/* ------------------------------------------------------------------ */
/* Packing                                                             */
/* ------------------------------------------------------------------ */

function probeAt(item, x, y) {
  return { x, y, w: item.w, h: item.h, rot: item.rot };
}

// Best of N random candidates: nearest the cluster centre, with a little
// noise so the result still looks scattered.
function sampleSpot(item, placed, radius, target, cfg, rng) {
  const reach = Math.hypot(item.w, item.h) / 2;
  const spread = Math.max(0, radius - reach);
  let best = null;
  let bestScore = Infinity;

  for (let k = 0; k < cfg.candidates; k++) {
    const angle = rng() * Math.PI * 2;
    const distance = Math.sqrt(rng()) * spread;
    const probe = probeAt(item, Math.cos(angle) * distance, Math.sin(angle) * distance);

    if (!fits(probe, placed, radius, cfg.pad)) continue;

    const score =
      Math.hypot(probe.x - target.x, probe.y - target.y) +
      rng() * cfg.jitter * radius;

    if (score < bestScore) {
      bestScore = score;
      best = probe;
    }
  }

  return best;
}

function packFresh(items, cfg, rng) {
  const order = items.slice().sort((a, b) => b.w * b.h - a.w * a.h);
  let radius = estimateRadius(order, cfg);
  const placed = [];

  for (const item of order) {
    item.x = 0;
    item.y = 0;

    if (!placed.length) {
      placed.push(item);
      continue;
    }

    const target = centroidOf(placed);
    let spot = null;

    for (let grow = 0; grow < 80 && !spot; grow++) {
      spot = sampleSpot(item, placed, radius, target, cfg, rng);
      if (!spot) radius *= 1.04;
    }

    if (spot) {
      item.x = spot.x;
      item.y = spot.y;
    } else {
      item.x = target.x;
      item.y = target.y;
    }

    placed.push(item);
  }

  return radius;
}

// Slide each photo toward the centre as far as it will go. Repeating in
// alternating order lets neighbours swap the gaps they are blocking.
function compact(items, radius, cfg) {
  for (let iter = 0; iter < cfg.compact; iter++) {
    const order = iter % 2 ? items.slice().reverse() : items;

    for (const item of order) {
      const others = items.filter((o) => o !== item);

      for (let step = 0; step < 10; step++) {
        const d = Math.hypot(item.x, item.y);
        if (d < 2) break;

        const length = Math.max(2, d * 0.1);
        const probe = probeAt(item, item.x - (item.x / d) * length, item.y - (item.y / d) * length);

        if (!fits(probe, others, radius, cfg.pad)) break;

        item.x = probe.x;
        item.y = probe.y;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Minimum enclosing circle (Welzl, incremental)                       */
/* ------------------------------------------------------------------ */

function circleFrom2(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    r: Math.hypot(a.x - b.x, a.y - b.y) / 2,
  };
}

function circleFrom3(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));

  if (Math.abs(d) < 1e-9) {
    return [circleFrom2(a, b), circleFrom2(b, c), circleFrom2(a, c)]
      .reduce((best, cur) => (cur.r > best.r ? cur : best));
  }

  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;

  return { x, y, r: Math.hypot(x - a.x, y - a.y) };
}

function holds(circle, p) {
  return Math.hypot(p.x - circle.x, p.y - circle.y) <= circle.r + 1e-6;
}

function minEnclosingCircle(points) {
  let c = { x: points[0].x, y: points[0].y, r: 0 };

  for (let i = 0; i < points.length; i++) {
    if (holds(c, points[i])) continue;
    c = { x: points[i].x, y: points[i].y, r: 0 };

    for (let j = 0; j < i; j++) {
      if (holds(c, points[j])) continue;
      c = circleFrom2(points[i], points[j]);

      for (let k = 0; k < j; k++) {
        if (holds(c, points[k])) continue;
        c = circleFrom3(points[i], points[j], points[k]);
      }
    }
  }

  return c;
}

// A video print can land anywhere in the circle, including the bottom edge
// where the project label hangs. Slide it straight up until something blocks
// it, so the screen never sits on the caption.
function liftClips(items, radius, cfg) {
  const clips = items.filter((item) => item.kind === 'video' || item.kind === 'clip');

  for (const clip of clips) {
    const others = items.filter((item) => item !== clip);

    for (let step = 0; step < 60; step++) {
      const probe = probeAt(clip, clip.x, clip.y - clip.h * 0.2);
      if (!fits(probe, others, radius, cfg.pad)) break;
      clip.y = probe.y;
    }
  }
}

function layoutFresh(items, cfg, rng) {
  const bound = packFresh(items, cfg, rng);
  compact(items, bound, cfg);

  const points = [];
  for (const item of items) points.push(...cornersOf(item));

  const circle = minEnclosingCircle(points);
  for (const item of items) {
    item.x -= circle.x;
    item.y -= circle.y;
  }

  return radiusOf(items);
}

function layoutIncremental(items, previousRadius, cfg, rng) {
  const placed = items.filter((item) => item.locked);
  const pending = items
    .filter((item) => !item.locked)
    .sort((a, b) => b.w * b.h - a.w * a.h);

  let radius = Math.max(previousRadius || 0, estimateRadius(items, cfg));

  for (const item of pending) {
    const target = placed.length ? centroidOf(placed) : { x: 0, y: 0 };
    let spot = null;

    for (let grow = 0; grow < 80 && !spot; grow++) {
      spot = sampleSpot(item, placed, radius, target, cfg, rng);
      if (!spot) radius *= 1.04;
    }

    if (spot) {
      item.x = spot.x;
      item.y = spot.y;
    } else {
      item.x = target.x;
      item.y = target.y;
    }

    // Old photos stay put; this one slides toward the centre on its own.
    for (let step = 0; step < 240; step++) {
      const d = Math.hypot(item.x, item.y);
      if (d < 2) break;

      const length = clamp(d * 0.01, 1, 24);
      const probe = probeAt(item, item.x - (item.x / d) * length, item.y - (item.y / d) * length);

      if (!fits(probe, placed, radius, cfg.pad)) break;

      item.x = probe.x;
      item.y = probe.y;
    }

    placed.push(item);
  }

  return radiusOf(items);
}

/* ------------------------------------------------------------------ */
/* One project                                                         */
/* ------------------------------------------------------------------ */

function layoutProject(project, previous, cfg, forceFresh) {
  const rng = makeRng(hashSeed(
    project.slug + ':pack' + (forceFresh ? ':shuffle:' + (cfg.shuffleSeed || 0) : '')
  ));

  const items = project.images.map((img) => ({
    kind: img.kind || 'photo',
    videoId: img.videoId || '',
    src: img.src,
    w: img.w,
    h: img.h,
    pw: img.pw || img.w,
    ph: img.ph || img.h,
    side: img.side || 0,
    bottom: img.bottom || 0,
    text: img.text || '',
    date: img.date || '',
    srcset: img.srcset || '',
    nw: img.nw || img.w,
    nh: img.nh || img.h,
    rot: (makeRng(hashSeed(project.slug + ':' + img.src))() * 2 - 1) * cfg.maxRot,
    x: 0,
    y: 0,
    locked: false,
  }));

  const oldSpots = new Map();
  if (!forceFresh && previous && Array.isArray(previous.images)) {
    for (const im of previous.images) {
      if (im && typeof im.src === 'string') oldSpots.set(im.src, im);
    }
  }

  for (const item of items) {
    const was = oldSpots.get(item.src);
    if (!was || !Number.isFinite(was.x) || !Number.isFinite(was.y)) continue;
    if (Math.abs(was.w - item.w) > 0.5 || Math.abs(was.h - item.h) > 0.5) continue;

    item.x = was.x;
    item.y = was.y;
    item.rot = clamp(Number(was.rot) || 0, -cfg.maxRot, cfg.maxRot);
    item.locked = true;
  }

  // A changed pad or rotation cap can make old placements illegal; in that
  // case the project is repacked from scratch once.
  if (items.some((item) => item.locked)) {
    const locked = items.filter((item) => item.locked);
    let illegal = false;

    for (let a = 0; a < locked.length && !illegal; a++) {
      for (let b = a + 1; b < locked.length; b++) {
        if (!apart(locked[a], locked[b], cfg.pad)) {
          illegal = true;
          break;
        }
      }
    }

    if (illegal) {
      for (const item of items) item.locked = false;
    }
  }

  let radius;

  if (items.every((item) => item.locked)) {
    radius = radiusOf(items);
  } else if (items.some((item) => item.locked)) {
    radius = layoutIncremental(items, previous && previous.radius, cfg, rng);
  } else {
    radius = layoutFresh(items, cfg, rng);
  }

  liftClips(items, radius, cfg);

  // Label anchor: below the lowest printed corner, not the circle's bottom
  // (a circle around a wide cluster has a large empty cap).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    for (const p of cornersOf(item)) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const label = {
    x: round((minX + maxX) / 2, 1),
    y: round(maxY + radius * 0.03, 1),
    width: round(radius * 1.3, 1),
    size: round(radius * 0.095, 1),
    dateSize: round(radius * 0.065, 1),
  };

  return {
    label,
    images: items.map((item) => ({
      kind: item.kind,
      videoId: item.videoId,
      src: item.src,
      w: item.w,
      h: item.h,
      pw: item.pw,
      ph: item.ph,
      side: item.side,
      bottom: item.bottom,
      text: item.text,
      date: item.date,
      srcset: item.srcset || '',
      nw: item.nw,
      nh: item.nh,
      x: round(item.x, 1),
      y: round(item.y, 1),
      rot: round(item.rot, 2),
    })),
    radius,
  };
}

/* ------------------------------------------------------------------ */
/* Project circles                                                     */
/* ------------------------------------------------------------------ */

function seedFreshClusters(clusters, gap) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const anchored = clusters.filter((c) => Number.isFinite(c.x));
  let base = 0;

  for (const c of anchored) base = Math.max(base, Math.hypot(c.x, c.y) + c.radius);

  let fresh = 0;
  for (const c of clusters) {
    if (Number.isFinite(c.x) && Number.isFinite(c.y)) continue;

    const angle = fresh * golden + 0.9;
    const distance = anchored.length
      ? base + (c.radius + gap) * Math.sqrt(fresh + 1)
      : (c.radius + gap) * Math.sqrt(fresh);

    c.x = Math.cos(angle) * distance;
    c.y = Math.sin(angle) * distance;
    fresh++;
  }
}

function separateClusters(clusters, gap) {
  for (let iter = 0; iter < 800; iter++) {
    let moved = false;

    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        const A = clusters[a];
        const B = clusters[b];
        let dx = B.x - A.x;
        let dy = B.y - A.y;
        let d = Math.hypot(dx, dy);

        if (d === 0) {
          dx = 1;
          dy = 0;
          d = 1;
        }

        const need = A.radius + B.radius + gap;

        // Sub-pixel rounding of saved centres must not trigger a push.
        if (d < need - 0.5) {
          // A pinned circle holds its ground, so the free one takes the whole
          // push. Two pinned circles cannot be reconciled; their placement
          // rules are the authority.
          if (A.pinned && B.pinned) continue;

          const push = need - d + 0.5;
          const ux = dx / d;
          const uy = dy / d;

          if (A.pinned) {
            B.x += ux * push;
            B.y += uy * push;
          } else if (B.pinned) {
            A.x -= ux * push;
            A.y -= uy * push;
          } else {
            A.x -= ux * push * 0.5;
            A.y -= uy * push * 0.5;
            B.x += ux * push * 0.5;
            B.y += uy * push * 0.5;
          }
          moved = true;
        }
      }
    }

    if (!moved) break;
  }
}

// Pull every circle toward the centre until a neighbour blocks it. This
// evens out the gaps instead of scaling the whole map down. The 2px buffer
// stops repeated builds from creeping inward on rounding noise.
function attractClusters(clusters, gap) {
  if (clusters.length < 2) return;

  let cx = 0;
  let cy = 0;
  for (const c of clusters) {
    cx += c.x;
    cy += c.y;
  }
  cx /= clusters.length;
  cy /= clusters.length;

  for (let iter = 0; iter < 500; iter++) {
    let moved = false;

    for (const c of clusters) {
      if (c.pinned) continue;

      const dx = cx - c.x;
      const dy = cy - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;

      const step = Math.min(d * 0.04, 80);
      const nx = c.x + (dx / d) * step;
      const ny = c.y + (dy / d) * step;

      let free = true;
      for (const other of clusters) {
        if (other === c) continue;
        if (Math.hypot(other.x - nx, other.y - ny) < other.radius + c.radius + gap + 2) {
          free = false;
          break;
        }
      }

      if (free) {
        c.x = nx;
        c.y = ny;
        moved = true;
      }
    }

    if (!moved) break;
  }
}

/* A circle named in GALLERY.placement is pinned to a fixed relationship
   instead of drifting with the packing: `above` or `below` parks it clear on
   that side of the anchor circle, `drop` adds extra clearance on that side,
   and `near` slides it along the line toward a second circle. The anchor is
   pinned too, so every later pass moves the rest of the map around them. */
function applyPlacements(clusters, cfg) {
  const rules = cfg.placement || {};
  const bySlug = new Map();
  for (const c of clusters) bySlug.set(c.slug, c);

  for (const slug of Object.keys(rules)) {
    const rule = rules[slug];
    const c = bySlug.get(slug);
    if (!c || !rule) continue;

    const below = rule.below ? bySlug.get(rule.below) : null;
    const anchor = rule.above ? bySlug.get(rule.above) : below;
    if (!anchor) continue;

    const shift = Number.isFinite(rule.shift) ? rule.shift : 0.35;
    const near = rule.near ? bySlug.get(rule.near) : null;
    const drop = Number.isFinite(rule.drop) ? rule.drop : 0;
    const side = below ? 1 : -1;

    c.x = near ? anchor.x + (near.x - anchor.x) * shift : anchor.x;
    c.y = anchor.y + side * (anchor.radius + cfg.projectGap + c.radius + 16 + drop);
    c.pinned = true;
    anchor.pinned = true;
  }
}

export function layoutGallery(projects, previous, config) {
  const cfg = { ...FALLBACK, ...(config || {}) };

  // An older manifest describes a different packing model or frame; ignore
  // it once and repack from scratch.
  const hash = frameHash(cfg.frame || FRAME);
  const usable =
    previous && previous.layoutVersion === LAYOUT_VERSION && previous.frameHash === hash
      ? previous
      : null;

  const prevBySlug = new Map();
  let prevOffsetX = 0;
  let prevOffsetY = 0;

  if (usable && Array.isArray(usable.projects)) {
    for (const p of usable.projects) {
      if (p && typeof p.slug === 'string') prevBySlug.set(p.slug, p);
    }
    if (usable.canvas) {
      prevOffsetX = Number(usable.canvas.offsetX) || 0;
      prevOffsetY = Number(usable.canvas.offsetY) || 0;
    }
  }

  const clusters = [];
  const shuffled = new Set(cfg.shuffle || []);

  for (const project of projects) {
    const prev = prevBySlug.get(project.slug);
    const laid = layoutProject(project, prev, cfg, shuffled.has(project.slug));

    const cluster = {
      slug: project.slug,
      id: project.id || 0,
      title: project.title || project.slug,
      shortTitle: project.shortTitle || project.title || project.slug,
      href: project.href || '',
      start: project.start || null,
      end: project.end || null,
      seed: hashSeed(project.slug + ':ring'),
      radius: laid.radius,
      label: laid.label,
      images: laid.images,
    };

    if (prev) {
      if (Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
        cluster.x = prev.x;
        cluster.y = prev.y;
      } else if (Number.isFinite(prev.cx) && Number.isFinite(prev.cy)) {
        cluster.x = prev.cx - prevOffsetX;
        cluster.y = prev.cy - prevOffsetY;
      }
    }

    clusters.push(cluster);
  }

  seedFreshClusters(clusters, cfg.projectGap);
  separateClusters(clusters, cfg.projectGap);
  attractClusters(clusters, cfg.projectGap);
  applyPlacements(clusters, cfg);
  separateClusters(clusters, cfg.projectGap);
  attractClusters(clusters, cfg.projectGap);
  separateClusters(clusters, cfg.projectGap);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of clusters) {
    minX = Math.min(minX, c.x - c.radius);
    minY = Math.min(minY, c.y - c.radius);
    maxX = Math.max(maxX, c.x + c.radius);
    maxY = Math.max(maxY, c.y + c.radius);
  }

  if (!clusters.length) {
    minX = minY = maxX = maxY = 0;
  }

  const margin = cfg.clusterMargin;
  const offsetX = margin - minX;
  const offsetY = margin - minY;

  return {
    frameHash: hash,
    canvas: {
      width: Math.ceil(maxX - minX + margin * 2),
      height: Math.ceil(maxY - minY + margin * 2),
      offsetX: round(offsetX, 2),
      offsetY: round(offsetY, 2),
    },
    projects: clusters.map((c) => ({
      slug: c.slug,
      id: c.id,
      title: c.title,
      shortTitle: c.shortTitle,
      href: c.href,
      start: c.start,
      end: c.end,
      seed: c.seed,
      x: round(c.x, 2),
      y: round(c.y, 2),
      cx: round(c.x + offsetX, 1),
      cy: round(c.y + offsetY, 1),
      radius: c.radius,
      label: c.label,
      images: c.images,
    })),
  };
}

// Cheap post-conditions for the build script.
export function verifyLayout(model, config) {
  const cfg = { ...FALLBACK, ...(config || {}) };
  const problems = [];

  for (const project of model.projects) {
    const imgs = project.images;

    // Saved coordinates are rounded to 0.1px and rotations to 0.01deg, so a
    // photo that was packed exactly `pad` away can land a hair inside it.
    const pad = Math.max(0, cfg.pad - 0.5);

    for (let a = 0; a < imgs.length; a++) {
      for (let b = a + 1; b < imgs.length; b++) {
        if (!apart(imgs[a], imgs[b], pad)) {
          problems.push(`${project.slug}: photos ${a} and ${b} are too close`);
        }
      }
    }

    for (const img of imgs) {
      if (!insideCircle(img, project.radius)) {
        problems.push(`${project.slug}: a photo crosses the circle`);
        break;
      }
    }
  }

  for (let a = 0; a < model.projects.length; a++) {
    for (let b = a + 1; b < model.projects.length; b++) {
      const A = model.projects[a];
      const B = model.projects[b];
      const d = Math.hypot(A.cx - B.cx, A.cy - B.cy);
      if (d < A.radius + B.radius + cfg.projectGap - 1) {
        problems.push(`${A.slug} and ${B.slug} circles are too close`);
      }
    }
  }

  return problems;
}
