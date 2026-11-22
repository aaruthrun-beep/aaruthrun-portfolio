/**
 * AARUTHRUN PORTFOLIO — GALLERY 1: ROW REEL
 *
 * A second way to read the photo archive. The screen is divided into three
 * rows; every project owns one row and its photos stream past horizontally
 * in an endless loop. Scrolling the page moves down to the next projects and
 * gives every row a horizontal shove, so a flick downwards reads sideways.
 *
 * Data comes from the same data/gallery.json the map uses — nothing here
 * changes the map.
 */

const GalleryRows = (function () {
  'use strict';

  var SOURCE = 'data/gallery.json';
  var BASE_SPEED = 26;        // px/s, the quietest row
  var SPEED_STEP = 9;         // each following row drifts a little faster
  var SCROLL_GAIN = 0.55;     // px/s added per px scrolled
  var MAX_IMPULSE = 900;      // px/s ceiling for a hard flick
  var IMPULSE_DECAY = 0.94;   // per frame, ~1s to settle

  var rows = [];
  var scroller = null;
  var impulse = 0;
  var lastScroll = 0;
  var rafId = null;
  var lastTime = 0;
  var started = false;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** The smallest derivative in a srcset, so a row costs almost nothing. */
  function thumbOf(photo) {
    var candidates = (photo.srcset || '').split(',');
    var first = candidates[0] && candidates[0].trim().split(/\s+/)[0];
    return first || photo.src;
  }

  function buildPrint(photo, project) {
    var figure = document.createElement('figure');
    figure.className = 'gr-print';

    var img = document.createElement('img');
    img.src = thumbOf(photo);
    if (photo.srcset) img.srcset = photo.srcset;
    img.sizes = '(max-width: 700px) 55vw, 26vw';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = photo.text || (project.shortTitle || project.title) + ' — photograph';
    if (photo.w && photo.h) img.style.aspectRatio = photo.w + ' / ' + photo.h;
    figure.appendChild(img);

    return figure;
  }

  function buildRun(photos, project) {
    var run = document.createElement('div');
    run.className = 'gr-run';
    photos.forEach(function (photo) {
      run.appendChild(buildPrint(photo, project));
    });
    return run;
  }

  function buildRow(project, index) {
    var el = document.createElement('section');
    el.className = 'gr-row';
    el.setAttribute('aria-label', project.title);

    var photos = (project.images || []).filter(function (photo) {
      return photo && photo.kind !== 'video' && (photo.srcset || photo.src);
    });

    var track = document.createElement('div');
    track.className = 'gr-row-track';
    var run = buildRun(photos, project);
    track.appendChild(run);
    el.appendChild(track);

    var meta = document.createElement('div');
    meta.className = 'gr-row-meta';
    meta.innerHTML =
      '<span class="gr-row-idx">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="gr-row-name">' + esc(project.shortTitle || project.title) + '</span>' +
      '<span class="gr-row-count">' + photos.length + ' PHOTOS</span>';
    el.appendChild(meta);

    return {
      el: el,
      track: track,
      run: run,
      photos: photos,
      project: project,
      // Alternating directions keep three moving rows from reading as one slide.
      dir: index % 2 === 0 ? 1 : -1,
      speed: BASE_SPEED + (index % 3) * SPEED_STEP,
      pos: 0,
      runWidth: 0,
      runCount: 1,
      held: false
    };
  }

  /** One copy of a run is often narrower than the screen; tile until it wraps. */
  function ensureCopies(row) {
    var width = row.el.clientWidth || 1;
    row.runWidth = row.run.getBoundingClientRect().width;
    if (!row.runWidth) return;

    var needed = Math.max(2, Math.ceil((width + row.runWidth) / row.runWidth) + 1);
    needed = Math.min(needed, 4);
    while (row.track.children.length < needed) {
      var copy = row.run.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      row.track.appendChild(copy);
    }
    row.runCount = row.track.children.length;
  }

  function render(model, mount) {
    var projects = (model.projects || []).filter(function (project) {
      return project && project.images && project.images.length;
    });

    if (!projects.length) throw new Error('gallery.json has no photos');

    mount.innerHTML = '';
    rows = projects.map(function (project, index) {
      var row = buildRow(project, index);
      mount.appendChild(row.el);
      return row;
    });

    layoutRows();
    // Fonts settle a moment later and can change how many copies a row needs.
    window.setTimeout(layoutRows, 400);

    if (reduceMotion) return;
    pump();
  }

  /**
   * Three rows fill the screen, so each row is a third of the scroller's
   * height in pixels: a percentage would resolve against the auto-height
   * stack and collapse the rows onto their content.
   */
  function layoutRows() {
    var main = document.querySelector('.gr-main');
    var third = main ? Math.round(main.clientHeight / 3) : 0;

    rows.forEach(function (row) {
      if (third) row.el.style.height = Math.max(120, third) + 'px';
      ensureCopies(row);
    });
  }

  function pump() {
    if (rafId === null) {
      lastTime = 0;
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function tick(time) {
    time = time || performance.now();
    rafId = null;
    var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;

    impulse *= IMPULSE_DECAY;
    if (impulse < 0.5) impulse = 0;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var speed = (row.held && impulse === 0 ? 0 : row.speed) + impulse;
      if (row.runWidth) {
        row.pos += speed * dt;
        if (row.pos >= row.runWidth) row.pos -= row.runWidth;
        if (row.pos < 0) row.pos += row.runWidth;
        var x = row.dir === 1 ? -row.pos : row.pos - row.runWidth;
        row.track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      }
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function onScroll() {
    var top = scroller === document.scrollingElement || scroller === document.body
      ? window.pageYOffset
      : scroller.scrollTop;
    var delta = Math.abs(top - lastScroll);
    lastScroll = top;
    impulse = Math.min(MAX_IMPULSE, impulse + delta * SCROLL_GAIN);
  }

  function setupScrollDriver() {
    scroller = document.querySelector('.gr-main');
    if (!scroller) return;
    lastScroll = scroller.scrollTop;
    scroller.addEventListener('scroll', onScroll, { passive: true });
  }

  /** Hovering a row parks it so a photo can actually be looked at. */
  function setupHold() {
    rows.forEach(function (row) {
      row.el.addEventListener('mouseenter', function () { row.held = true; });
      row.el.addEventListener('mouseleave', function () { row.held = false; });
    });
  }

  function fail(mount) {
    mount.innerHTML = '<p class="gr-status">The photo rows could not be loaded. ' +
      'Add data/gallery.json to this folder.</p>';
  }

  function init() {
    if (started) return;
    started = true;

    var mount = document.getElementById('gr-rows');
    if (!mount) return;

    setupScrollDriver();

    fetch(SOURCE, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + SOURCE);
        return res.json();
      })
      .then(function (model) {
        render(model, mount);
        setupHold();
      })
      .catch(function (err) {
        console.error('[GalleryRows] ' + err.message);
        fail(mount);
      });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layoutRows, 140);
    });
  }

  if (document.readyState !== 'loading') { init(); }
  else { document.addEventListener('DOMContentLoaded', init); }

  return {
    init: init,
    rows: function () { return rows; }
  };
})();
