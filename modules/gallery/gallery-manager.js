/**
 * AARUTHRUN PORTFOLIO - GALLERY MANAGER MODULE
 * Renders the project-circle map that tools/build-gallery.mjs writes to
 * data/gallery.json.
 *
 * Every project owns a hand-drawn circle. Its photos sit inside at natural
 * pixel size, scattered at random and never overlapping. Adding a photo grows
 * only that circle, and the neighbours move aside to keep clear space.
 *
 * Performance: full-res images are preloaded on init so zooming swaps a
 * cached source instead of refetching; pointer tilt is throttled with
 * requestAnimationFrame; pan/zoom write the transform directly so dragging
 * stays smooth.
 */

const GalleryManager = (function () {
  'use strict';

  const CFG = AppConfig.getGallery();
  const SOURCE = 'data/gallery.json';

  var P = {
    border: '#D8DAD4',
    accent: '#315C9B',
    card:   '#FAFAF7',
    muted:  '#737B78',
    ink:    '#202522',
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Split the ISO date by hand: new Date('2026-03-15') is parsed as UTC and
  // can land on the previous day west of Greenwich.
  function formatDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return value;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    try {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return value;
    }
  }

  var scale = 1, tx = 0, ty = 0;
  var fitScale = 0;
  var resTicking = false;
  var dragging = false, ddX = 0, ddY = 0;
  var vp = null, cvs = null;
  var started = false;
  var tiltRaf = null;

  /* ------------------------------------------------------------------ */
  /* View transform                                                      */
  /* ------------------------------------------------------------------ */

  function applyTransform() {
    if (!cvs) return;
    cvs.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';

    // Picking a file size per frame would be wasteful; once per frame is plenty.
    if (!resTicking) {
      resTicking = true;
      window.requestAnimationFrame(function () {
        resTicking = false;
        sweepVisible();
        refreshResolution();
      });
    }

    // Video prints decide from their on-screen size whether their player
    // shows a playback bar, so they need to hear about every zoom step.
    try {
      window.dispatchEvent(new CustomEvent('gallery:transform', { detail: { scale: scale } }));
    } catch (e) {}
  }

  /* The floor is relative to the fitted view. On a phone the whole map already
     fits at roughly the absolute minScale, so a fixed floor made zooming out
     clamp straight back and look locked. */
  function minScaleAllowed() {
    if (!fitScale) return CFG.minScale;
    return Math.min(CFG.minScale, fitScale * 0.45);
  }

  function fitToScreen() {
    if (!vp || !cvs) return;
    var vw = vp.clientWidth, vh = vp.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    var photos = cvs.querySelectorAll('.gl-photo');
    if (photos.length === 0) return;

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    function grow(el) {
      var l = parseFloat(el.style.left) || 0;
      var t = parseFloat(el.style.top) || 0;
      var w = parseFloat(el.style.width) || 0;
      var h = parseFloat(el.style.height) || 0;
      if (l < minX) minX = l;
      if (t < minY) minY = t;
      if (l + w > maxX) maxX = l + w;
      if (t + h > maxY) maxY = t + h;
    }

    for (var i = 0; i < photos.length; i++) grow(photos[i]);
    var rings = cvs.querySelectorAll('.gl-ring');
    for (var r = 0; r < rings.length; r++) grow(rings[r]);

    var cw = maxX - minX, ch = maxY - minY;
    if (cw <= 0 || ch <= 0) return;

    // 0.9 leaves room for the captions that hang below each circle
    fitScale = Math.min(vw / cw, vh / ch) * 0.9;
    scale = Math.max(minScaleAllowed(), Math.min(fitScale, CFG.maxScale));

    tx = (vw - cw * scale) / 2 - minX * scale;
    ty = (vh - ch * scale) / 2 - minY * scale;
    applyTransform();
  }

  // screen = world * scale + (tx, ty). To keep the world point under the
  // cursor fixed while scaling, the translation has to scale too:
  //   t' = anchor - (anchor - t) * k
  function zoomBy(factor, anchorX, anchorY) {
    var ns = Math.max(minScaleAllowed(), Math.min(scale * factor, CFG.maxScale));
    if (ns === scale) return;
    var k = ns / scale;
    tx = anchorX - (anchorX - tx) * k;
    ty = anchorY - (anchorY - ty) * k;
    scale = ns;
    applyTransform();
  }

  function zoomIn() {
    if (!vp) return;
    zoomBy(CFG.zoomFactor, vp.clientWidth / 2, vp.clientHeight / 2);
  }

  function zoomOut() {
    if (!vp) return;
    zoomBy(1 / CFG.zoomFactor, vp.clientWidth / 2, vp.clientHeight / 2);
  }

  /* ------------------------------------------------------------------ */
  /* Image loading: only what is on screen, at the size it is drawn      */
  /* ------------------------------------------------------------------ */

  // A print is laid out 4000 CSS pixels wide, so the browser's own srcset
  // sizing always asks for the largest candidate and the map ends up
  // downloading every photo at full resolution before the first pan. Instead
  // each print loads when it scrolls near the viewport, at the 800px
  // derivative, and only steps up to 1600px or the original once the zoom
  // makes the extra pixels visible.
  var TIERS = ['thumb', 'small', 'medium', 'large'];
  var photoIndex = [];
  var visiblePhotos = new Set();

  function tierSource(img, tier) {
    if (tier === 'large') {
      return img.dataset.srcLarge || img.dataset.srcMedium || img.dataset.srcSmall ||
             img.dataset.srcThumb || '';
    }
    if (tier === 'medium') {
      return img.dataset.srcMedium || img.dataset.srcSmall || img.dataset.srcThumb || '';
    }
    if (tier === 'small') {
      return img.dataset.srcSmall || img.dataset.srcMedium || img.dataset.srcThumb || '';
    }
    return img.dataset.srcThumb || img.dataset.srcSmall || '';
  }

  function setTier(img, tier, allowDowngrade) {
    var want = TIERS.indexOf(tier);
    if (want < 0) return;

    var src = tierSource(img, tier);
    if (!src) return;

    // First load: nothing on screen yet, so nothing to protect - request it.
    // (A print that has not loaded is labelled with its starting tier, which
    // must not be mistaken for "already showing this file".)
    if (!img.getAttribute('src')) {
      img.dataset.tier = tier;
      img.src = src;
      return;
    }

    var have = TIERS.indexOf(img.dataset.tier || 'thumb');
    if (have < 0) have = 0;
    if (want === have) return;
    if (!allowDowngrade && want < have) return;

    img.dataset.tier = tier;

    // Later upgrades swap only once the new file has decoded, so a print
    // never blinks out while zooming.
    var pre = new Image();
    pre.onload = function () {
      if (img.dataset.tier === tier) img.src = src;
    };
    pre.src = src;
  }

  /* How many device pixels each visible print covers right now. */
  function refreshResolution() {
    if (!visiblePhotos.size) return;

    var dpr = window.devicePixelRatio || 1;
    visiblePhotos.forEach(function (img) {
      var pw = parseFloat(img.getAttribute('width')) || 0;
      var need = pw * scale * dpr;
      var tier = need > 2200 ? 'large'
               : need > 900 ? 'medium'
               : need > 420 ? 'small'
               : 'thumb';
      setTier(img, tier, need < 300);
    });
  }

  // Prints sit at known canvas coordinates, so "is this on screen" is a few
  // lines of arithmetic instead of a layout read per photo per frame.
  function indexPhotos() {
    var photos = cvs ? cvs.querySelectorAll('.gl-photo') : [];
    photoIndex = [];
    visiblePhotos.clear();

    for (var i = 0; i < photos.length; i++) {
      var img = photos[i].querySelector('img.gl-img');
      if (!img) continue;
      photoIndex.push({
        img: img,
        x: parseFloat(photos[i].style.left) || 0,
        y: parseFloat(photos[i].style.top) || 0,
        w: parseFloat(photos[i].style.width) || 0,
        h: parseFloat(photos[i].style.height) || 0,
      });
    }
  }

  /* Request every print near the viewport, forget the rest. */
  function sweepVisible() {
    if (!photoIndex.length || !vp || !scale) return;

    var margin = 700 / scale;
    var left = -tx / scale - margin;
    var top = -ty / scale - margin;
    var right = (vp.clientWidth - tx) / scale + margin;
    var bottom = (vp.clientHeight - ty) / scale + margin;

    visiblePhotos.clear();

    for (var i = 0; i < photoIndex.length; i++) {
      var entry = photoIndex[i];
      var hit = entry.x < right && entry.x + entry.w > left &&
                entry.y < bottom && entry.y + entry.h > top;
      if (!hit) continue;

      visiblePhotos.add(entry.img);
      if (!entry.img.getAttribute('src')) setTier(entry.img, 'thumb', true);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Interactions                                                        */
  /* ------------------------------------------------------------------ */

  function setupInteractions() {
    if (!vp) return;

    // A press anywhere - including on a photo - starts a pan. Photos are
    // links, so their native image drag has to be disabled separately,
    // otherwise the browser drags the picture into a new tab instead.
    // Either mouse button pans: left for ordinary dragging, right for the
    // habits picked up in CAD and map tools.
    var moved = false, startX = 0, startY = 0, wasDrag = false;

    // Touch pointers are tracked so two fingers can pinch: one finger pans,
    // two fingers zoom about the point between them. Without this the browser
    // cannot help - the map's own zoom owns the gesture.
    var touches = new Map();
    var pinch = null;

    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // The context menu would cut a right-button drag short.
    vp.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    function pinchState() {
      var pts = Array.from(touches.values());
      if (pts.length < 2) return null;

      var a = pts[0], b = pts[1];
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
    }

    function beginPinch() {
      var state = pinchState();
      if (!state) return;

      var rect = vp.getBoundingClientRect();

      // The world point under the fingers' midpoint stays under it for the
      // whole gesture; that is what makes a pinch feel attached to the map.
      pinch = {
        dist: state.dist,
        scale: scale,
        worldX: (state.x - rect.left - tx) / scale,
        worldY: (state.y - rect.top - ty) / scale,
      };

      dragging = false;
      wasDrag = true; /* a pinch is never a click */
      vp.style.cursor = 'grabbing';
      swapToFull();
    }

    function endPointer(e) {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;

      if (touches.size === 0) {
        dragging = false;
        vp.style.cursor = 'grab';
      } else {
        // Keep panning from where the remaining finger is, no jump.
        var rest = Array.from(touches.values())[0];
        dragging = true;
        ddX = rest.x - tx;
        ddY = rest.y - ty;
      }

      try { vp.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    vp.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.button !== 2) return;

      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try { vp.setPointerCapture(e.pointerId); } catch (_) {}

        if (touches.size >= 2) {
          beginPinch();
          return;
        }
      }

      dragging = true; moved = false; wasDrag = false;
      startX = e.clientX; startY = e.clientY;
      ddX = e.clientX - tx; ddY = e.clientY - ty;
      vp.style.cursor = 'grabbing';
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    });
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    vp.addEventListener('pointermove', function (e) {
      if (touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pinch && touches.size >= 2) {
          var state = pinchState();
          if (!state) return;

          var rect = vp.getBoundingClientRect();
          var next = Math.max(
            minScaleAllowed(),
            Math.min(pinch.scale * (state.dist / pinch.dist), CFG.maxScale)
          );

          scale = next;
          tx = (state.x - rect.left) - pinch.worldX * scale;
          ty = (state.y - rect.top) - pinch.worldY * scale;
          applyTransform();
          return;
        }
      }

      if (!dragging) return;
      if (!moved && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 4) {
        moved = true;
      }
      if (moved) wasDrag = true;
      tx = e.clientX - ddX; ty = e.clientY - ddY; applyTransform();
    }, { passive: true });

    // iOS Safari fires its own gesture events, which zoom the whole page
    // (and leave the map behind) even with touch-action set.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (name) {
      document.addEventListener(name, function (e) { e.preventDefault(); }, { passive: false });
    });

    // After a pan, swallow the click so a photo does not open (lightbox or
    // page) when the user meant to drag the map.
    vp.addEventListener('click', function (e) {
      if (!wasDrag) return;
      wasDrag = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    vp.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = Math.exp(-e.deltaY * 0.0024);
      factor = Math.max(0.72, Math.min(factor, 1.4));
      var rect = vp.getBoundingClientRect();
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    var bi = document.getElementById('btn-zoom-in');
    var bo = document.getElementById('btn-zoom-out');
    var br = document.getElementById('btn-zoom-reset');
    if (bi) bi.addEventListener('click', zoomIn);
    if (bo) bo.addEventListener('click', zoomOut);
    if (br) br.addEventListener('click', fitToScreen);
  }

  /* ------------------------------------------------------------------ */
  /* Hand-drawn circle                                                   */
  /* ------------------------------------------------------------------ */

  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function smoothPath(pts) {
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2;
      var my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) +
           ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    return d;
  }

  function handDrawnCircle(radius, seed) {
    var rng = makeRng(seed);
    var pad = radius * 0.02 + 8;
    var size = (radius + pad) * 2;
    var c = radius + pad;

    var start = rng() * Math.PI * 2;
    var sweep = Math.PI * 2 * (1.015 + rng() * 0.05);
    var ph1 = rng() * Math.PI * 2;
    var ph2 = rng() * Math.PI * 2;
    var amp1 = 0.010 + rng() * 0.009;
    var amp2 = 0.004 + rng() * 0.005;
    var steps = 80;  // reduced from 150: fewer path points, same look

    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var a = start + sweep * t;
      var wobble = 1 +
        amp1 * Math.sin(a * 2.7 + ph1) +
        amp2 * Math.sin(a * 6.1 + ph2) +
        (rng() - 0.5) * 0.006;
      var r = radius * wobble;
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }

    var second = pts.map(function (p) {
      return [c + (p[0] - c) * 1.007 + 1.4, c + (p[1] - c) * 1.007 - 1.2];
    });

    return { size: size, d1: smoothPath(pts), d2: smoothPath(second) };
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  function fail(canvasEl) {
    canvasEl.innerHTML = '<p style="position:absolute;left:50%;top:50%;width:420px;' +
      'transform:translate(-50%,-50%);margin:0;text-align:center;color:' + P.muted +
      ';font-family:var(--font-mono);font-size:0.8125rem;line-height:1.6;">' +
      'Gallery map is not built yet.<br>' +
      '<code style="color:' + P.ink + ';">node tools/build-gallery.mjs</code>' +
      '</p>';
  }

  function render(model, canvasEl) {
    // Rendering is idempotent: js/app.js also calls init() after this module
    // has already bootstrapped itself.
    var stale = canvasEl.querySelectorAll('.gl-photo, .gl-ring, .gl-label');
    for (var s = 0; s < stale.length; s++) stale[s].remove();

    var canvasW = model.canvas && model.canvas.width ? model.canvas.width : 0;
    var canvasH = model.canvas && model.canvas.height ? model.canvas.height : 0;

    canvasEl.style.width = canvasW + 'px';
    canvasEl.style.height = canvasH + 'px';

    var html = '';

    for (var k = 0; k < model.projects.length; k++) {
      var proj = model.projects[k];
      var cx = proj.cx;
      var cy = proj.cy;
      var R = proj.radius;
      var sketch = handDrawnCircle(R, proj.seed);
      var half = sketch.size / 2;

      html += '<svg class="gl-ring" aria-hidden="true" style="position:absolute;left:' +
              (cx - half).toFixed(1) + 'px;top:' + (cy - half).toFixed(1) +
              'px;width:' + sketch.size + 'px;height:' + sketch.size +
              'px;overflow:visible;pointer-events:none;" viewBox="0 0 ' +
              sketch.size + ' ' + sketch.size + '">' +
              '<path d="' + sketch.d1 + '" fill="none" stroke="' + P.ink +
              '" stroke-opacity="0.26" stroke-width="1.6" stroke-linecap="round" ' +
              'vector-effect="non-scaling-stroke"/>' +
              '<path d="' + sketch.d2 + '" fill="none" stroke="' + P.ink +
              '" stroke-opacity="0.12" stroke-width="1.1" stroke-linecap="round" ' +
              'vector-effect="non-scaling-stroke"/></svg>';

      for (var b = 0; b < proj.images.length; b++) {
        var img = proj.images[b];
        var left = cx + img.x - img.w / 2;
        var top = cy + img.y - img.h / 2;
        var side = img.side || 0;
        var bottom = img.bottom || 0;
        var pw = img.pw || img.w;
        var ph = img.ph || img.h;

        var caption = '';
        if (img.text) caption += '<span class="note">' + esc(img.text) + '</span>';
        if (img.date) {
          caption += '<time datetime="' + esc(img.date) + '">' +
                     esc(formatDate(img.date)) + '</time>';
        }

        // A video is the same framed print with a player where the photograph
        // would be. The mount stays empty until the print is on screen; the
        // video module fills it.
        if (img.kind === 'video') {
          var videoAlt = (proj.shortTitle || proj.title) +
                         (img.text ? ' — ' + img.text : '') + ' — video';

          html += '<div class="gl-photo gl-video" data-video="' + esc(img.videoId) + '"' +
                  ' data-rot="' + img.rot.toFixed(2) +
                  '" style="left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) +
                  'px;width:' + img.w + 'px;height:' + img.h +
                  'px;transform:rotate(' + img.rot.toFixed(2) + 'deg);">' +
                  '<figure class="polaroid" style="padding:' + side + 'px ' + side +
                  'px ' + bottom + 'px;--side:' + side + 'px;--bottom:' + bottom + 'px;">' +
                  '<div class="gl-video-mount" role="img" aria-label="' + esc(videoAlt) +
                  '" style="width:' + pw + 'px;height:' + ph + 'px;"></div>' +
                  '<span class="gl-video-badge" aria-hidden="true">VIDEO' +
                  (img.text ? ' \u00b7 ' + esc(img.text) : '') + '</span>' +
                  '</figure></div>';
          continue;
        }

        // The photo is a print on the map, but it still needs a name for
        // screen readers and the lightbox: project, note and date, never a
        // filename.
        var photoAlt = proj.shortTitle || proj.title;
        if (img.text) photoAlt += ' — ' + img.text;
        if (img.date) photoAlt += ' — ' + formatDate(img.date);

        // Photo sets that belong to an existing page (Avani AgroTech on
        // startup.html) carry their own href from the build.
        var href = proj.href || ('project-' + encodeURIComponent(proj.slug) + '.html');

        // The resolution ladder the build wrote for the archive cards: 800px
        // for an overview, 1600px once zoomed, and the original only when the
        // print is drawn wider than that.
        var srcThumb = '', srcSmall = '', srcMedium = '';
        var candidates = (img.srcset || '').split(',');
        for (var s = 0; s < candidates.length; s++) {
          var bits = candidates[s].trim().split(/\s+/);
          if (bits.length < 2) continue;
          var candidateWidth = parseInt(bits[1], 10);
          if (candidateWidth === 400) srcThumb = bits[0];
          else if (candidateWidth === 800) srcSmall = bits[0];
          else if (candidateWidth === 1600) srcMedium = bits[0];
        }
        if (!srcSmall) srcSmall = srcMedium || img.src;
        if (!srcMedium) srcMedium = srcSmall;
        if (!srcThumb) srcThumb = srcSmall;
        var srcLarge = img.fullsrc || img.src;

        html += '<a class="gl-photo" href="' + href +
                '" data-project="' + href +
                '" aria-label="Open ' + esc(proj.shortTitle || proj.title) + ' documentation"' +
                ' data-rot="' + img.rot.toFixed(2) +
                '" style="left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) +
                'px;width:' + img.w + 'px;height:' + img.h +
                'px;transform:rotate(' + img.rot.toFixed(2) + 'deg);">' +
                '<figure class="polaroid" style="padding:' + side + 'px ' + side +
                'px ' + bottom + 'px;--side:' + side + 'px;--bottom:' + bottom + 'px;">' +
                '<img class="gl-img" data-src-thumb="' + esc(srcThumb) +
                '" data-src-small="' + esc(srcSmall) +
                '" data-src-medium="' + esc(srcMedium) +
                '" data-src-large="' + esc(srcLarge) +
                '" alt="' + esc(photoAlt) + '" ' +
                'draggable="false" decoding="async" width="' + pw + '" height="' + ph +
                '" style="width:' + pw + 'px;height:' + ph + 'px;">' +
                (caption ? '<figcaption>' + caption + '</figcaption>' : '') +
                '</figure></a>';
      }

      var label = proj.label || {
        x: 0,
        y: R,
        width: R * 1.1,
        size: R * 0.085,
        dateSize: R * 0.06,
      };

      var period = '';
      if (proj.start) period = proj.start + ' \u2192 ' + (proj.end || 'NOW');
      else if (proj.end) period = proj.end;

      html += '<div class="gl-label" style="position:absolute;left:' +
              (cx + label.x).toFixed(1) + 'px;top:' + (cy + label.y).toFixed(1) +
              'px;width:' + label.width + 'px;transform:translateX(-50%);' +
              'text-align:center;pointer-events:none;">' +
              '<span class="gl-name" style="display:block;font-family:var(--font-mono);' +
              'font-size:' + label.size + 'px;font-weight:600;line-height:1.2;color:' +
              P.muted + ';">' + esc(proj.shortTitle) + '</span>' +
              (period
                ? '<span class="gl-date" style="display:block;margin-top:' +
                  (label.size * 0.15).toFixed(1) + 'px;font-family:var(--font-mono);font-size:' +
                  label.dateSize + 'px;color:' + P.muted + ';">' + period + '</span>'
                : '') +
              '</div>';
    }

    canvasEl.insertAdjacentHTML('beforeend', html);

    // Photos request their own file as they come near the viewport; the first
    // sweep runs through fitToScreen() at the end of this function.
    indexPhotos();

    // gallery-video.js declares a top-level const, which is a binding, not a
    // window property - test the identifier rather than window.*.
    if (typeof GalleryVideo !== 'undefined') GalleryVideo.scan(canvasEl);

    var photos = canvasEl.querySelectorAll('.gl-photo');
    var reduced = window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (var e = 0; e < photos.length; e++) {
      (function (link, idx) {
        if (reduced) { link.style.opacity = '1'; return; }
        var delay = Math.min(idx * 12, 360);
        link.style.opacity = '0';
        link.style.transition = 'opacity 480ms ease ' + delay + 'ms';
        setTimeout(function () { link.style.opacity = '1'; }, 40);
      })(photos[e], e);
    }

    for (var h = 0; h < photos.length; h++) {
      (function (link) {
        var base = parseFloat(link.getAttribute('data-rot')) || 0;

        link.addEventListener('mouseenter', function () {
          link.classList.add('is-hover');
          link.style.zIndex = '5';
        });

        link.addEventListener('pointermove', function (ev) {
          if (!link.matches(':hover')) return;
          var rect = link.getBoundingClientRect();
          var dx = (ev.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          var dy = (ev.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          if (tiltRaf !== null) return;
          tiltRaf = requestAnimationFrame(function () {
            tiltRaf = null;
            link.style.transform = 'rotate(' + (base + dy * 2.5).toFixed(2) +
                                   'deg) translateY(' + (-dx * 3).toFixed(2) + 'px)';
          });
        }, { passive: true });

        link.addEventListener('mouseleave', function () {
          link.classList.remove('is-hover');
          link.style.zIndex = '';
          link.style.transform = 'rotate(' + base + 'deg)';
        });
      })(photos[h]);
    }

    fitToScreen();
  }

  function renderGallery() {
    var canvasEl = document.getElementById('gallery-canvas');
    if (!canvasEl) return;

    fetch(SOURCE, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + SOURCE);
        return res.json();
      })
      .then(function (model) {
        if (!model || !model.projects || !model.projects.length) {
          throw new Error('gallery.json has no projects');
        }
        render(model, canvasEl);
      })
      .catch(function (err) {
        console.error('[Gallery] ' + err.message);
        fail(canvasEl);
      });
  }

  function init() {
    if (started) return;
    started = true;
    vp = document.getElementById('gallery-viewport');
    cvs = document.getElementById('gallery-canvas');
    if (!vp || !cvs) return;
    setupInteractions();
    renderGallery();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(fitToScreen, 80);
    });
  }

  if (document.readyState !== 'loading') { init(); }
  else { document.addEventListener('DOMContentLoaded', init); }

  return {
    init: init,
    fitToScreen: fitToScreen,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
  };
})();
