/**
 * AARUTHRUN PORTFOLIO — GALLERY VIDEO PLAYERS
 *
 * tools/build-gallery.mjs writes one print per video link in a project's
 * videos.txt. This module fills those prints with a muted, looping YouTube
 * player, so the gallery wall plays by itself without asking for a click.
 *
 * Two rules keep the map usable:
 *   1. Nothing loads until the print is inside the viewport, and the player is
 *      torn down when the print scrolls out of it.
 *   2. Below videoControlsPx on screen the print has no chrome and ignores the
 *      pointer, so dragging pans the map. Zoomed in past that width the
 *      standard playback bar appears and the video takes the pointer, so it
 *      can be scrubbed, paused or muted.
 *
 * The player is rebuilt when that second rule flips, at the moment playback
 * had reached, so crossing the zoom threshold does not restart the clip.
 */

const GalleryVideo = (function () {
  'use strict';

  var CFG = (typeof AppConfig !== 'undefined' && typeof AppConfig.getGallery === 'function')
    ? AppConfig.getGallery()
    : {};
  var CONTROLS_PX = Number(CFG.videoControlsPx) || 420;

  var apiPromise = null;
  var tiles = [];
  var clips = [];
  var viewport = null;
  var raf = null;

  /* ------------------------------------------------------------------ */
  /* YouTube IFrame API                                                  */
  /* ------------------------------------------------------------------ */

  function loadApi() {
    if (apiPromise) return apiPromise;

    apiPromise = new Promise(function (resolve) {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      var previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') previous();
        resolve();
      };

      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    });

    return apiPromise;
  }

  /* ------------------------------------------------------------------ */
  /* One print                                                           */
  /* ------------------------------------------------------------------ */

  // The player replaces the element it is given, so it is given a child of
  // the mount rather than the mount itself: the 16:9 box then survives and
  // clips the player to exactly the picture area.
  function makeMount(tile) {
    var mount = document.createElement('div');
    mount.className = 'gl-video-mount';
    mount.style.width = tile.pw + 'px';
    mount.style.height = tile.ph + 'px';

    var host = document.createElement('div');
    host.className = 'gl-video-host';
    mount.appendChild(host);

    var figure = tile.el.querySelector('figure');
    var badge = tile.el.querySelector('.gl-video-badge');
    if (figure) figure.insertBefore(mount, badge || null);
    else tile.el.appendChild(mount);

    return mount;
  }

  function sizeIframe(tile) {
    var frame = null;
    try {
      frame = tile.player && tile.player.getIframe ? tile.player.getIframe() : null;
    } catch (e) {
      frame = null;
    }
    if (!frame) return;

    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = '0';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.setAttribute('allowfullscreen', '');
  }

  function destroy(tile) {
    if (tile.player) {
      try {
        tile.player.destroy();
      } catch (e) {
        // A player destroyed mid-load throws; there is nothing left to free.
      }
      tile.player = null;
    }

    tile.controls = null;
    tile.el.classList.remove('has-controls');

    var leftover = tile.el.querySelector('.gl-video-mount');
    if (leftover) leftover.remove();
  }

  function currentTime(tile) {
    try {
      if (tile.player && typeof tile.player.getCurrentTime === 'function') {
        return Number(tile.player.getCurrentTime()) || 0;
      }
    } catch (e) {
      // Not ready yet; start from the beginning.
    }
    return 0;
  }

  function create(tile, controls, startAt) {
    if (!tile.id || !window.YT || !window.YT.Player) return;

    var mount = makeMount(tile);
    var host = mount.firstChild;
    var start = Math.floor(Number(startAt) || 0);

    tile.controls = controls;
    tile.el.classList.toggle('has-controls', controls);

    tile.player = new window.YT.Player(host, {
      videoId: tile.id,
      width: '100%',
      height: '100%',
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        mute: 1,              /* browsers only allow muted autoplay */
        loop: 1,
        playlist: tile.id,    /* loop=1 needs the id repeated here */
        controls: controls ? 1 : 0,
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: controls ? 0 : 1,
        fs: controls ? 1 : 0,
        start: start > 1 ? start : 0,
      },
      events: {
        onReady: function (event) {
          try {
            sizeIframe(tile);
            event.target.mute();
            event.target.playVideo();
            event.target.setVolume(0);
          } catch (e) {
            // Autoplay refused: the print stays on YouTube's poster frame.
          }
        },
      },
    });
  }

  function rebuild(tile, controls) {
    var at = currentTime(tile);
    destroy(tile);
    create(tile, controls, at);
  }

  /* ------------------------------------------------------------------ */
  /* Visibility and zoom                                                 */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* Local clips                                                         */
  /* ------------------------------------------------------------------ */

  // Clips from the project folder are plain <video> elements. The file is not
  // requested until the print is on screen, and playback stops when it leaves,
  // so a wall of clips costs nothing until it is looked at.
  function syncClips(view) {
    for (var i = 0; i < clips.length; i++) {
      var clip = clips[i];
      var video = clip.video;
      if (!video) continue;

      var box = clip.el.getBoundingClientRect();
      var visible = box.right > view.left + 8 && box.left < view.right - 8 &&
                    box.bottom > view.top + 8 && box.top < view.bottom - 8;

      if (!visible) {
        if (!video.paused) {
          try {
            video.pause();
          } catch (e) {
            // Nothing to pause yet.
          }
        }
        continue;
      }

      if (!clip.attached) {
        var src = clip.el.getAttribute('data-clip');
        if (src) {
          video.setAttribute('src', src);
          video.load();
        }
        clip.attached = true;
      }

      if (video.paused && !document.hidden) {
        var playing = video.play();
        if (playing && typeof playing.catch === 'function') {
          playing.catch(function () {
            // Autoplay refused (or the file is still loading): the poster frame
            // stays, and the next sweep tries again.
          });
        }
      }
    }
  }

  function sync() {
    if (!viewport || (!tiles.length && !clips.length)) return;

    var view = viewport.getBoundingClientRect();

    syncClips(view);

    for (var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      var box = tile.el.getBoundingClientRect();

      var visible = box.right > view.left + 8 && box.left < view.right - 8 &&
                    box.bottom > view.top + 8 && box.top < view.bottom - 8;

      if (!visible) {
        if (tile.player) destroy(tile);
        continue;
      }

      var controls = box.width >= CONTROLS_PX;

      if (!tile.player) {
        create(tile, controls, 0);
      } else if (tile.controls !== controls) {
        rebuild(tile, controls);
      }
    }
  }

  function schedule() {
    if (raf !== null) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      sync();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Wiring                                                              */
  /* ------------------------------------------------------------------ */

  function scan(canvasEl) {
    viewport = document.getElementById('gallery-viewport') || viewport;
    if (!canvasEl || !viewport) return;

    tiles = [];
    clips = [];

    var clipPrints = canvasEl.querySelectorAll('.gl-clip');
    for (var c = 0; c < clipPrints.length; c++) {
      clips.push({
        el: clipPrints[c],
        video: clipPrints[c].querySelector('.gl-clip-video'),
        attached: false,
      });
    }

    var prints = canvasEl.querySelectorAll('.gl-video');
    for (var i = 0; i < prints.length; i++) {
      var mount = prints[i].querySelector('.gl-video-mount');
      tiles.push({
        el: prints[i],
        id: prints[i].getAttribute('data-video') || '',
        pw: mount ? parseFloat(mount.style.width) || 0 : 0,
        ph: mount ? parseFloat(mount.style.height) || 0 : 0,
        player: null,
        controls: null,
      });
    }

    // Fill the prints as soon as the API is ready; requestAnimationFrame does
    // not tick in a background tab, so the first pass is not left to it.
    if (tiles.length) loadApi().then(sync);
    if (tiles.length || clips.length) schedule();
  }

  window.addEventListener('gallery:transform', schedule);
  window.addEventListener('resize', schedule);

  document.addEventListener('visibilitychange', function () {
    if (!viewport) return;

    for (var c = 0; c < clips.length; c++) {
      var video = clips[c].video;
      if (!video || !clips[c].attached) continue;
      try {
        if (document.hidden) video.pause();
        else video.play().catch(function () {});
      } catch (e) {
        // Not loaded yet; the next sweep will start it.
      }
    }

    if (!tiles.length) return;

    for (var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      if (!tile.player) continue;
      try {
        if (document.hidden) tile.player.pauseVideo();
        else tile.player.playVideo();
      } catch (e) {
        // Player not ready; the next visibility change will try again.
      }
    }
  });

  return { scan: scan, sync: sync };
})();
