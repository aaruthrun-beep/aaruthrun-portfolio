/**
 * AARUTHRUN PORTFOLIO — IMAGE LIGHTBOX
 * Works for the gallery map's polaroid links and the project media grid.
 * Keeps the underlying link (project page) available inside the overlay.
 */

const Lightbox = (function () {
  'use strict';

  let overlay = null;
  let imageEl = null;
  let captionEl = null;
  let projectEl = null;
  let counterEl = null;
  let items = [];
  let current = 0;
  let lastFocus = null;

  function collect(trigger) {
    const group = trigger.getAttribute('data-lightbox-group');
    if (group) {
      return Array.from(document.querySelectorAll('[data-lightbox-group="' + CSS.escape(group) + '"]'));
    }
    return Array.from(document.querySelectorAll('.gl-photo:not(.gl-video), .js-lightbox'));
  }

  function dataFor(anchor) {
    const img = anchor.querySelector('img');
    const caption = anchor.getAttribute('data-caption') ||
      (anchor.querySelector('figcaption') ? anchor.querySelector('figcaption').textContent.replace(/\s+/g, ' ').trim() : '') ||
      (img ? img.alt : '');
    const href = anchor.getAttribute('href') || '';
    return {
      src: img ? (img.dataset.srcLarge || img.currentSrc || img.src) : '',
      alt: img ? img.alt : caption,
      caption: caption,
      project: anchor.getAttribute('data-project') || (/project\.html/.test(href) ? href : '')
    };
  }

  function render(index) {
    if (!items.length) return;
    current = (index + items.length) % items.length;
    const data = dataFor(items[current]);
    imageEl.src = data.src;
    imageEl.alt = data.alt;
    captionEl.textContent = data.caption || '';
    counterEl.textContent = items.length > 1 ? (current + 1) + ' / ' + items.length : '';
    projectEl.hidden = !data.project;
    if (data.project) projectEl.href = data.project;
    overlay.hidden = false;
    document.body.classList.add('lightbox-open');
    overlay.focus();
  }

  function close() {
    overlay.hidden = true;
    document.body.classList.remove('lightbox-open');
    imageEl.src = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image viewer');
    overlay.tabIndex = -1;
    overlay.innerHTML =
      '<div class="lightbox-bar"><span class="lightbox-counter"></span><button class="lightbox-close" type="button" aria-label="Close image viewer">Close ✕</button></div>' +
      '<div class="lightbox-stage"><button class="lightbox-prev" type="button" aria-label="Previous image">←</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lightbox-next" type="button" aria-label="Next image">→</button></div>' +
      '<div class="lightbox-foot"><a class="lightbox-project" href="projects.html" hidden>Open project documentation →</a><span class="lightbox-hint">Esc to close · arrow keys to move</span></div>';
    document.body.appendChild(overlay);

    imageEl = overlay.querySelector('img');
    captionEl = overlay.querySelector('figcaption');
    projectEl = overlay.querySelector('.lightbox-project');
    counterEl = overlay.querySelector('.lightbox-counter');

    overlay.querySelector('.lightbox-close').addEventListener('click', close);
    overlay.querySelector('.lightbox-prev').addEventListener('click', function () { render(current - 1); });
    overlay.querySelector('.lightbox-next').addEventListener('click', function () { render(current + 1); });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.classList.contains('lightbox-stage')) close();
    });
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { close(); }
      else if (event.key === 'ArrowLeft') { render(current - 1); }
      else if (event.key === 'ArrowRight') { render(current + 1); }
    });
  }

  function init() {
    if (overlay) return;
    build();
    document.addEventListener('click', function (event) {
      const trigger = event.target.closest('.gl-photo:not(.gl-video), .js-lightbox');
      if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      if (trigger.classList.contains('js-lightbox') && !/\.(jpe?g|png|webp|gif|avif)$/i.test(trigger.getAttribute('href') || '')) return;
      event.preventDefault();
      lastFocus = trigger;
      items = collect(trigger);
      render(items.indexOf(trigger));
    });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return { init: init, open: render, close: close };
})();
