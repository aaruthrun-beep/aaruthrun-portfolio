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
  }

  function fitToScreen() {
    if (!vp || !cvs) return;
    var vw = vp.clientWidth, vh = vp.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    var photos = cvs.querySelectorAll('a.gl-photo');
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
    scale = Math.min(vw / cw, vh / ch) * 0.9;
    scale = Math.max(CFG.minScale, Math.min(scale, CFG.maxScale));

    tx = (vw - cw * scale) / 2 - minX * scale;
    ty = (vh - ch * scale) / 2 - minY * scale;
    applyTransform();
  }

  // screen = world * scale + (tx, ty). To keep the world point under the
  // cursor fixed while scaling, the translation has to scale too:
  //   t' = anchor - (anchor - t) * k
  function zoomBy(factor, anchorX, anchorY) {
    var ns = Math.max(CFG.minScale, Math.min(scale * factor, CFG.maxScale));
    if (ns === scale) return;
    var k = ns / scale;
    tx = anchorX - (anchorX - tx) * k;
    ty = anchorY - (anchorY - ty) * k;
    scale = ns;
    applyTransform();
  }

  function zoomIn() {
    if (!vp) return;
    swapToFull();
    zoomBy(CFG.zoomFactor, vp.clientWidth / 2, vp.clientHeight / 2);
  }

  function zoomOut() {
    if (!vp) return;
    swapToThumb();
    zoomBy(1 / CFG.zoomFactor, vp.clientWidth / 2, vp.clientHeight / 2);
  }

  /* ------------------------------------------------------------------ */
  /* Zoom image swap (full-res sources are preloaded on init)            */
  /* ------------------------------------------------------------------ */

  function swapToFull() {
    if (!cvs) return;
    var imgs = cvs.querySelectorAll('img.gl-img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.dataset.fullsrc || img.dataset.fullsrc === img.src) continue;
      var tmp = img.src;
      img.src = img.dataset.fullsrc;
      img.dataset.fullsrc = tmp;
    }
  }

  function swapToThumb() {
    if (!cvs) return;
    var imgs = cvs.querySelectorAll('img.gl-img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.dataset.fullsrc || img.dataset.fullsrc === img.src) continue;
      var tmp = img.src;
      img.src = img.dataset.fullsrc;
      img.dataset.fullsrc = tmp;
    }
  }

  function preloadImages() {
    if (!cvs) return;
    var imgs = cvs.querySelectorAll('img.gl-img');
    for (var i = 0; i < imgs.length; i++) {
      var full = imgs[i].dataset.fullsrc;
      if (!full || full === imgs[i].src) continue;
      var pref = new Image();
      pref.src = full;
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

    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // The context menu would cut a right-button drag short.
    vp.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    vp.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.button !== 2) return;
      dragging = true; moved = false; wasDrag = false;
      startX = e.clientX; startY = e.clientY;
      ddX = e.clientX - tx; ddY = e.clientY - ty;
      vp.style.cursor = 'grabbing';
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    });
    window.addEventListener('pointerup', function (e) {
      dragging = false; vp.style.cursor = 'grab';
      try { vp.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    window.addEventListener('pointercancel', function () {
      dragging = false; vp.style.cursor = 'grab';
    });
    vp.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (!moved && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 4) {
        moved = true;
      }
      if (moved) wasDrag = true;
      tx = e.clientX - ddX; ty = e.clientY - ddY; applyTransform();
    }, { passive: true });

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
      var factor = Math.exp(-e.deltaY * 0.0016);
      factor = Math.max(0.82, Math.min(factor, 1.22));
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

        // The photo is a print on the map, but it still needs a name for
        // screen readers and the lightbox: project, note and date, never a
        // filename.
        var photoAlt = proj.shortTitle || proj.title;
        if (img.text) photoAlt += ' — ' + img.text;
        if (img.date) photoAlt += ' — ' + formatDate(img.date);

        var href = 'project-' + encodeURIComponent(proj.slug) + '.html';

        html += '<a class="gl-photo" href="' + href +
                '" data-project="' + href +
                '" aria-label="Open ' + esc(proj.shortTitle || proj.title) + ' documentation"' +
                ' data-rot="' + img.rot.toFixed(2) +
                '" style="left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) +
                'px;width:' + img.w + 'px;height:' + img.h +
                'px;transform:rotate(' + img.rot.toFixed(2) + 'deg);">' +
                '<figure class="polaroid" style="padding:' + side + 'px ' + side +
                'px ' + bottom + 'px;--side:' + side + 'px;--bottom:' + bottom + 'px;">' +
                '<img class="gl-img" src="' + img.src + '" data-fullsrc="' +
                esc(img.fullsrc || img.src) +
                (img.srcset ? '" srcset="' + img.srcset : '') +
                '" sizes="' + pw + 'px" alt="' + esc(photoAlt) + '" ' +
                'loading="lazy" draggable="false" decoding="async" width="' + pw + '" height="' + ph +
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

      html += '<div class="gl-label" style="position:absolute;left:' +
              (cx + label.x).toFixed(1) + 'px;top:' + (cy + label.y).toFixed(1) +
              'px;width:' + label.width + 'px;transform:translateX(-50%);' +
              'text-align:center;pointer-events:none;">' +
              '<span class="gl-name" style="display:block;font-family:var(--font-mono);' +
              'font-size:' + label.size + 'px;font-weight:600;line-height:1.2;color:' +
              P.muted + ';">' + esc(proj.shortTitle) + '</span>' +
              '<span class="gl-date" style="display:block;margin-top:' +
              (label.size * 0.15).toFixed(1) + 'px;font-family:var(--font-mono);font-size:' +
              label.dateSize + 'px;color:' + P.muted + ';">' +
              (proj.start || '') + ' \u2192 ' + (proj.end || 'NOW') + '</span></div>';
    }

    canvasEl.insertAdjacentHTML('beforeend', html);

    // Cache full-res sources right away so zoom swaps are instant.
    preloadImages();

    var photos = canvasEl.querySelectorAll('a.gl-photo');
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
