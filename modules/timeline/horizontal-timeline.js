/**
 * AARUTHRUN PORTFOLIO — HORIZONTAL ENGINEERING TIMELINE
 *
 * One shared time axis, read left to right. Project durations are stacked into
 * lanes above the axis so overlapping work stays legible; recorded milestones
 * sit as circular markers on the axis itself. All content is derived from
 * projects.json — adding a project or milestone needs no layout changes.
 */

const HorizontalTimeline = (function () {
  'use strict';

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const STATUS = {
    completed: { label: 'COMPLETED', color: 'var(--tl-completed)' },
    active: { label: 'ACTIVE / ONGOING', color: 'var(--tl-active)' },
    paused: { label: 'PAUSED', color: 'var(--tl-paused)' },
    discontinued: { label: 'DISCONTINUED', color: 'var(--tl-discontinued)' },
    planned: { label: 'PLANNED', color: 'var(--tl-planned)' }
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function monthIndex(date) {
    return date.getFullYear() * 12 + date.getMonth();
  }

  function parseMonth(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (!Number.isFinite(year) || month < 0 || month > 11) return null;
    return new Date(year, month, 1);
  }

  function fmtMonth(value) {
    const date = value instanceof Date ? value : parseMonth(value);
    if (!date) return 'DATE NOT RECORDED';
    return MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  function fmtRange(project) {
    const start = fmtMonth(project.startDate);
    const end = project.endDate ? fmtMonth(project.endDate) : 'PRESENT';
    return start + ' — ' + end;
  }

  function normaliseStatus(value) {
    const raw = String(value || '').toLowerCase();
    if (raw.indexOf('discont') !== -1 || raw.indexOf('drop') !== -1) return 'discontinued';
    if (raw.indexOf('pause') !== -1 || raw.indexOf('hold') !== -1) return 'paused';
    if (raw.indexOf('plan') !== -1 || raw.indexOf('future') !== -1) return 'planned';
    if (raw.indexOf('active') !== -1 || raw.indexOf('ongoing') !== -1 || raw.indexOf('progress') !== -1) return 'active';
    if (raw.indexOf('complete') !== -1 || raw.indexOf('done') !== -1 || raw.indexOf('finish') !== -1) return 'completed';
    return 'planned';
  }

  function normaliseProject(project) {
    const meta = project.timeline || {};
    const start = meta.start || project.start;
    const startDate = parseMonth(start);
    if (!startDate) return null;

    const end = meta.end !== undefined ? meta.end : project.end;
    const statusKey = normaliseStatus(meta.status || project.status);
    const milestones = Array.isArray(meta.milestones)
      ? meta.milestones
      : (Array.isArray(project.milestones) ? project.milestones : []);

    return {
      id: String(meta.id || project.slug || project.id || project.title),
      slug: project.slug || '',
      name: meta.name || project.title || 'Untitled project',
      shortName: meta.shortName || project.shortTitle || project.title || 'Untitled project',
      start: start,
      startDate: startDate,
      end: end || null,
      endDate: parseMonth(end),
      statusKey: statusKey,
      statusLabel: STATUS[statusKey].label,
      statusRaw: meta.status || project.status || STATUS[statusKey].label,
      description: meta.description || project.summary || '',
      url: meta.url || (project.slug ? 'project-' + encodeURIComponent(project.slug) + '.html' : ''),
      category: meta.category || project.category || 'Engineering',
      tags: Array.isArray(project.tags) ? project.tags : [],
      milestones: milestones.map(function (milestone, index) {
        const date = parseMonth(milestone.date);
        return date ? {
          index: index,
          date: milestone.date,
          dateObj: date,
          label: milestone.label || 'Milestone',
          description: milestone.description || '',
          type: milestone.type || 'milestone'
        } : null;
      }).filter(Boolean)
    };
  }

  class Timeline {
    constructor(containerId) {
      this.el = document.getElementById(containerId);
      if (!this.el) return;

      this.projects = [];
      this.zoom = 'ALL';
      this.filterTag = 'ALL';
      this.filterStatus = 'ALL';
      this.now = startOfMonth(new Date());
      this.monthWidth = 30;
      this.canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      this.lastPointerType = 'mouse';
      this.pinned = false;
      this.activeCardEl = null;
      this.suppressClick = false;
      this.drag = null;

      this._buildShell();
      this._bindControls();
      this._bindGlobalEvents();
      this._init();
    }

    async _init() {
      try {
        const projects = await DataStore.getProjects();
        this.projects = (projects || []).map(normaliseProject).filter(Boolean);
        this._render();
      } catch (error) {
        console.error('[Timeline] Unable to load projects:', error);
        this.canvas.innerHTML = '<p class="tlx-empty">Unable to load timeline data.</p>';
      }
    }

    _buildShell() {
      this.el.innerHTML =
        '<div class="tlx">' +
          '<div class="tlx-head">' +
            '<div class="tlx-heading">' +
              '<span class="tlx-range" data-tlx-range></span>' +
              '<span class="tlx-count" data-tlx-count></span>' +
            '</div>' +
            '<span class="tlx-hint">SCROLL / DRAG &rarr;</span>' +
          '</div>' +
          '<div class="tlx-viewport" tabindex="0" role="region" aria-label="Horizontal engineering timeline. Scroll or drag left and right through the years.">' +
            '<div class="tlx-canvas"></div>' +
          '</div>' +
        '</div>';

      this.root = this.el.querySelector('.tlx');
      this.viewport = this.el.querySelector('.tlx-viewport');
      this.canvas = this.el.querySelector('.tlx-canvas');
      this.rangeEl = this.el.querySelector('[data-tlx-range]');
      this.countEl = this.el.querySelector('[data-tlx-count]');
      this.hintEl = this.el.querySelector('.tlx-hint');

      this.card = document.createElement('div');
      this.card.className = 'tlx-card';
      this.card.setAttribute('role', 'dialog');
      this.card.setAttribute('aria-label', 'Project timeline details');
      this.card.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.card);

      this._bindViewport();
    }

    _bindControls() {
      const bind = (selector, attribute, update) => {
        document.querySelectorAll(selector).forEach(button => {
          button.addEventListener('click', () => {
            document.querySelectorAll(selector).forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            update(button.getAttribute(attribute));
          });
        });
      };

      bind('[data-timeline-zoom]', 'data-timeline-zoom', value => {
        this.zoom = value;
        this._render();
      });

      bind('[data-tl-tag]', 'data-tl-tag', value => {
        this.filterTag = value;
        this._render();
      });

      bind('[data-tl-status]', 'data-tl-status', value => {
        this.filterStatus = value;
        this._render();
      });
    }

    _bindViewport() {
      this.viewport.addEventListener('pointerdown', event => {
        this.lastPointerType = event.pointerType || 'mouse';
        if (event.pointerType === 'touch') return;
        if (event.button !== 0 || event.target.closest('.tlx-card')) return;
        // Keep marker and rail links clickable. Pointer capture on the viewport
        // retargets the subsequent click, so links must opt out of drag capture.
        if (event.target.closest('.tlx-marker, .tlx-span')) return;
        this.drag = {
          startX: event.clientX,
          scrollLeft: this.viewport.scrollLeft,
          moved: false,
          id: event.pointerId
        };
        this.viewport.classList.add('is-dragging');
        try { this.viewport.setPointerCapture(event.pointerId); } catch (error) {}
      });

      this.viewport.addEventListener('pointermove', event => {
        if (!this.drag || event.pointerId !== this.drag.id) return;
        const delta = event.clientX - this.drag.startX;
        if (Math.abs(delta) > 4) this.drag.moved = true;
        this.viewport.scrollLeft = this.drag.scrollLeft - delta;
      });

      const endDrag = event => {
        if (!this.drag || (event && event.pointerId !== this.drag.id)) return;
        const moved = this.drag.moved;
        this.drag = null;
        this.viewport.classList.remove('is-dragging');
        if (moved) {
          this.suppressClick = true;
          window.setTimeout(() => { this.suppressClick = false; }, 40);
        }
      };
      this.viewport.addEventListener('pointerup', endDrag);
      this.viewport.addEventListener('pointercancel', endDrag);

      this.viewport.addEventListener('click', event => {
        if (this.suppressClick) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);

      this.viewport.addEventListener('keydown', event => {
        const step = Math.max(160, Math.round(this.viewport.clientWidth * 0.6));
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          this.viewport.scrollBy({ left: step, behavior: 'smooth' });
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this.viewport.scrollBy({ left: -step, behavior: 'smooth' });
        } else if (event.key === 'Home') {
          event.preventDefault();
          this.viewport.scrollTo({ left: 0, behavior: 'smooth' });
        } else if (event.key === 'End') {
          event.preventDefault();
          this.viewport.scrollTo({ left: this.viewport.scrollWidth, behavior: 'smooth' });
        }
      });

      this.viewport.addEventListener('scroll', () => {
        if (!this.pinned) this._hideCard();
      }, { passive: true });
    }

    _bindGlobalEvents() {
      document.addEventListener('pointerdown', event => {
        if (!this.pinned) return;
        if (this.card.contains(event.target)) return;
        if (event.target.closest('.tlx-span, .tlx-marker')) return;
        this._hideCard();
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') this._hideCard();
      });

      window.addEventListener('resize', () => {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => {
          this._hideCard();
          this._render();
        }, 120);
      });

      window.addEventListener('scroll', () => {
        if (!this.pinned) this._hideCard();
      }, { passive: true });
    }

    _visibleProjects() {
      return this.projects.filter(project => {
        const tagOk = this.filterTag === 'ALL' ||
          project.tags.some(tag => tag.toUpperCase() === this.filterTag.toUpperCase());
        const statusOk = this.filterStatus === 'ALL' ||
          project.statusKey === normaliseStatus(this.filterStatus);
        return tagOk && statusOk;
      });
    }

    _domain() {
      const visible = this._visibleProjects();
      const reference = visible.length ? visible : this.projects;

      let min = reference.reduce((earliest, project) => {
        return project.startDate < earliest ? project.startDate : earliest;
      }, reference[0] ? reference[0].startDate : this.now);

      let max = startOfMonth(this.now);
      reference.forEach(project => {
        const endpoint = project.endDate || (project.startDate > this.now ? project.startDate : this.now);
        if (endpoint > max) max = endpoint;
        project.milestones.forEach(milestone => {
          if (milestone.dateObj > max) max = milestone.dateObj;
        });
      });

      if (this.zoom === '1Y') {
        min = new Date(this.now.getFullYear(), this.now.getMonth() - 11, 1);
      } else if (this.zoom === '6M') {
        min = new Date(this.now.getFullYear(), this.now.getMonth() - 5, 1);
      } else if (min.getMonth() !== 0) {
        min = new Date(min.getFullYear(), 0, 1);
      }

      max = new Date(max.getFullYear(), max.getMonth() + 1, 1);
      if (max < min) max = new Date(min.getFullYear(), min.getMonth() + 1, 1);

      return { min: min, max: max, visible: visible };
    }

    _render() {
      if (!this.el) return;
      this._hideCard();

      const domain = this._domain();
      const visible = domain.visible.filter(project => {
        const end = project.endDate || domain.max;
        return end >= domain.min && project.startDate <= domain.max;
      });
      const startIndex = monthIndex(domain.min);
      const endIndex = monthIndex(domain.max);
      const months = Math.max(1, endIndex - startIndex + 1);

      const viewportWidth = this.viewport.clientWidth || 1080;
      const padLeft = 48;
      const padRight = 32;
      const fitWidth = (viewportWidth - padLeft - padRight) / months;
      this.monthWidth = this.zoom === 'ALL'
        ? clamp(fitWidth, 27, 40)
        : clamp(fitWidth, 48, 92);

      const plotWidth = months * this.monthWidth;
      const canvasWidth = Math.max(viewportWidth, padLeft + plotWidth + padRight);

      const laneCount = this._laneCount(visible, domain);
      const laneHeight = 31;
      const lanesTop = 84;
      const axisY = lanesTop + laneCount * laneHeight + 30;
      const canvasHeight = axisY + 48;

      this.canvas.style.width = canvasWidth + 'px';
      this.canvas.style.height = canvasHeight + 'px';
      this.canvas.style.setProperty('--axis-y', axisY + 'px');

      const rangeLabel = domain.min.getFullYear() + ' — ' + domain.max.getFullYear();
      const milestoneCount = visible.reduce((total, project) => {
        if (!project.milestones.length) {
          return total + (project.startDate >= domain.min && project.startDate <= domain.max ? 1 : 0);
        }
        return total + project.milestones.filter(milestone => {
          return milestone.dateObj >= domain.min && milestone.dateObj <= domain.max;
        }).length;
      }, 0);
      this.rangeEl.textContent = rangeLabel;
      this.countEl.textContent = visible.length + (visible.length === 1 ? ' PROJECT' : ' PROJECTS') +
        ' / ' + milestoneCount + (milestoneCount === 1 ? ' MILESTONE' : ' MILESTONES');

      if (!visible.length) {
        this.canvas.innerHTML = '<p class="tlx-empty">No projects match the selected filters.</p>';
        return;
      }

      const geometry = {
        startIndex: startIndex,
        endIndex: endIndex,
        months: months,
        padLeft: padLeft,
        padRight: padRight,
        plotWidth: plotWidth,
        canvasWidth: canvasWidth
      };
      geometry.xOfMonth = index => padLeft + (index - startIndex) * this.monthWidth;
      geometry.xOfDate = date => geometry.xOfMonth(monthIndex(date)) + this.monthWidth / 2;
      geometry.domain = domain;

      const bands = this._yearBands(geometry);
      const ticks = this._quarterTicks(geometry);
      const lanes = this._layoutLanes(visible, domain);
      const spans = this._renderSpans(lanes, geometry, axisY, laneCount, laneHeight);
      const markers = this._layoutMarkers(visible, geometry);
      const markerHtml = this._renderMarkers(markers, geometry, axisY);
      const today = this._renderToday(geometry, axisY, canvasHeight);

      this.canvas.innerHTML =
        '<div class="tlx-bands">' + bands + '</div>' +
        '<div class="tlx-year-labels">' + ticks.years + '</div>' +
        '<div class="tlx-quarter-labels">' + ticks.quarters + '</div>' +
        '<div class="tlx-spans" style="top:' + lanesTop + 'px">' + spans + '</div>' +
        '<div class="tlx-axis" style="top:' + axisY + 'px"></div>' +
        '<div class="tlx-axis-ticks">' + ticks.axisTicks + '</div>' +
        '<div class="tlx-stems">' + markerHtml.stems + '</div>' +
        '<div class="tlx-markers">' + markerHtml.dots + '</div>' +
        today;

      this._bindMarkers();

      const updateScrollState = () => {
        const overflow = this.viewport.scrollWidth > this.viewport.clientWidth + 1;
        this.root.classList.toggle('is-scrollable', overflow);
        if (this.hintEl) this.hintEl.textContent = overflow ? 'SCROLL / DRAG →' : 'FULL CHRONOLOGY';
      };
      updateScrollState();
      requestAnimationFrame(updateScrollState);
    }

    _laneCount(projects, domain) {
      if (!projects.length) return 1;
      const laneEnds = [];
      projects.slice()
        .sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate)
        .forEach(project => {
          const start = project.startDate < domain.min ? domain.min : project.startDate;
          const end = project.endDate || (project.startDate > this.now ? project.startDate : this.now);
          let lane = laneEnds.findIndex(laneEnd => laneEnd <= start);
          if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(end);
          } else {
            laneEnds[lane] = end;
          }
        });
      return Math.max(1, laneEnds.length);
    }

    _layoutLanes(projects, domain) {
      const laneEnds = [];
      return projects.slice()
        .sort((a, b) => a.startDate - b.startDate || String(a.name).localeCompare(String(b.name)))
        .map(project => {
          const start = project.startDate < domain.min ? domain.min : project.startDate;
          const end = project.endDate || (project.startDate > this.now ? project.startDate : this.now);
          let lane = laneEnds.findIndex(laneEnd => laneEnd <= start);
          if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(end);
          } else {
            laneEnds[lane] = end;
          }
          return { project: project, lane: lane, start: start, end: end };
        });
    }

    _yearBands(geometry) {
      const firstYear = geometry.domain.min.getFullYear();
      const lastYear = geometry.domain.max.getFullYear();
      const bands = [];

      for (let year = firstYear; year <= lastYear; year++) {
        const start = new Date(Math.max(geometry.domain.min.getTime(), new Date(year, 0, 1).getTime()));
        const end = new Date(year + 1, 0, 1);
        const left = geometry.xOfMonth(monthIndex(start));
        const right = monthIndex(end) <= geometry.endIndex
          ? geometry.xOfMonth(monthIndex(end))
          : geometry.padLeft + geometry.plotWidth;
        const width = Math.max(0, right - left);
        if (width <= 0) continue;
        bands.push('<span class="tlx-band' + (year % 2 ? ' is-alt' : '') + '" style="left:' + left + 'px;width:' + width + 'px"></span>');
      }

      return bands.join('');
    }

    _quarterTicks(geometry) {
      const years = [];
      const quarters = [];
      const axisTicks = [];
      const firstYear = geometry.domain.min.getFullYear();
      const lastYear = geometry.domain.max.getFullYear();

      for (let year = firstYear; year <= lastYear; year++) {
        const bandStart = Math.max(geometry.startIndex, monthIndex(new Date(year, 0, 1)));
        const bandEnd = Math.min(geometry.endIndex + 1, monthIndex(new Date(year + 1, 0, 1)));
        if (bandEnd <= bandStart) continue;

        const left = geometry.xOfMonth(bandStart);
        const right = geometry.xOfMonth(bandEnd);
        const center = (left + right) / 2;
        years.push('<span class="tlx-year-label" style="left:' + center + 'px">' + year + '</span>' +
          '<span class="tlx-year-line" style="left:' + Math.max(left, geometry.padLeft) + 'px"></span>');
      }

      const firstMonth = geometry.startIndex;
      const lastMonth = geometry.endIndex;
      for (let index = firstMonth; index <= lastMonth; index++) {
        const date = new Date(Math.floor(index / 12), index % 12, 1);
        if (date.getMonth() % 3 !== 0) continue;
        const left = geometry.xOfMonth(index);
        const label = MONTHS[date.getMonth()];
        quarters.push('<span class="tlx-quarter" style="left:' + left + 'px">' + label + '</span>');
        axisTicks.push('<span class="tlx-axis-tick" style="left:' + left + 'px"></span>');
      }

      return {
        years: years.join(''),
        quarters: quarters.join(''),
        axisTicks: axisTicks.join('')
      };
    }

    _renderSpans(lanes, geometry, axisY, laneCount, laneHeight) {
      return lanes.map(item => {
        const project = item.project;
        const left = geometry.xOfMonth(monthIndex(item.start));
        const right = geometry.xOfMonth(monthIndex(item.end)) + this.monthWidth;
        const width = Math.max(8, right - left);
        const top = item.lane * laneHeight;
        const ongoing = !project.endDate;
        const label = project.shortName;

        return '<a class="tlx-span' + (ongoing ? ' is-ongoing' : '') + (width < 120 ? ' is-tight' : '') + '"' +
          ' href="' + esc(project.url) + '"' +
          ' data-project="' + esc(project.id) + '"' +
          ' data-status="' + project.statusKey + '"' +
          ' style="left:' + left + 'px;width:' + width + 'px;top:' + top + 'px" ' +
          ' aria-label="' + esc(project.name + ', ' + fmtRange(project) + ', ' + project.statusLabel + '. Open project documentation.') + '">' +
          '<span class="tlx-span-name">' + esc(label) + '</span>' +
          '<span class="tlx-span-end" aria-hidden="true"></span>' +
        '</a>';
      }).join('');
    }

    _layoutMarkers(projects, geometry) {
      const markers = [];
      projects.forEach(project => {
        const list = project.milestones.length
          ? project.milestones
          : [{ index: 0, dateObj: project.startDate, date: project.start, label: 'Project start', description: '', type: 'start' }];

        list.forEach(milestone => {
          if (milestone.dateObj < geometry.domain.min || milestone.dateObj > geometry.domain.max) return;
          markers.push({
            project: project,
            milestone: milestone,
            x: geometry.xOfDate(milestone.dateObj),
            offset: 0
          });
        });
      });

      markers.sort((a, b) => a.x - b.x || String(a.project.name).localeCompare(String(b.project.name)));

      const offsets = [0, -12, 12, -24, 24, -36, 36];
      const lastX = {};
      markers.forEach(marker => {
        const offset = offsets.find(value => {
          return lastX[value] === undefined || Math.abs(marker.x - lastX[value]) >= 14;
        });
        marker.offset = offset === undefined ? 0 : offset;
        lastX[marker.offset] = marker.x;
      });

      return markers;
    }

    _renderMarkers(markers, geometry, axisY) {
      const stems = [];
      const dots = [];

      markers.forEach(marker => {
        const y = axisY + marker.offset;
        const project = marker.project;
        const milestone = marker.milestone;
        const label = milestone.label + ' — ' + fmtMonth(milestone.dateObj);
        const aria = label + ', ' + project.name + ', ' + project.statusLabel;

        if (marker.offset !== 0) {
          const top = Math.min(axisY, y);
          stems.push('<span class="tlx-stem" data-status="' + project.statusKey + '" style="left:' + marker.x + 'px;top:' + top + 'px;height:' + Math.abs(marker.offset) + 'px"></span>');
        }

        dots.push('<a class="tlx-marker" href="' + esc(project.url) + '"' +
          ' data-project="' + esc(project.id) + '"' +
          ' data-status="' + project.statusKey + '"' +
          ' data-milestone="' + milestone.index + '"' +
          ' style="left:' + marker.x + 'px;top:' + y + 'px" ' +
          ' aria-label="' + esc(aria) + '">' +
          '<span class="tlx-dot" aria-hidden="true"></span>' +
        '</a>');
      });

      return { stems: stems.join(''), dots: dots.join('') };
    }

    _renderToday(geometry, axisY, canvasHeight) {
      const todayX = geometry.xOfDate(this.now);
      if (todayX < geometry.padLeft || todayX > geometry.canvasWidth - geometry.padRight) return '';
      const label = 'TODAY · ' + MONTHS[this.now.getMonth()] + ' ' + this.now.getFullYear();
      return '<div class="tlx-today" style="left:' + todayX + 'px;top:0;height:' + canvasHeight + 'px">' +
        '<span class="tlx-today-label">' + label + '</span>' +
      '</div>';
    }

    _bindMarkers() {
      const elements = this.canvas.querySelectorAll('.tlx-span, .tlx-marker');

      elements.forEach(element => {
        const project = this.projects.find(item => item.id === element.getAttribute('data-project'));
        if (!project) return;

        let milestone = null;
        const milestoneIndex = element.getAttribute('data-milestone');
        if (milestoneIndex !== null) {
          milestone = project.milestones.find(item => String(item.index) === milestoneIndex) || null;
        }

        const showFromEvent = event => {
          if (event && event.pointerType === 'touch') return;
          if (this.pinned) return;
          this._showCard(project, milestone, event.clientX, event.clientY, false);
        };

        element.addEventListener('pointerenter', showFromEvent);
        element.addEventListener('pointermove', event => {
          if (this.pinned || !this.card.classList.contains('is-visible')) return;
          this._positionCard(event.clientX, event.clientY);
        });
        element.addEventListener('pointerleave', () => {
          if (!this.pinned) this._hideCard();
        });

        element.addEventListener('focus', () => {
          if (this.lastPointerType === 'touch') return;
          const rect = element.getBoundingClientRect();
          this._showCard(project, milestone, rect.left + rect.width / 2, rect.top + rect.height / 2, true, true);
        });
        element.addEventListener('blur', () => {
          if (this.pinned && this.keyboardPinned) this._hideCard();
        });

        element.addEventListener('click', event => {
          if (this.suppressClick) return;
          if (!this.canHover || this.lastPointerType === 'touch') {
            event.preventDefault();
            const rect = element.getBoundingClientRect();
            const key = project.id + ':' + (milestone ? milestone.index : 'project');
            if (this.pinned && this.activeKey === key) {
              this._hideCard();
            } else {
              this._showCard(project, milestone, rect.left + rect.width / 2, rect.top + rect.height / 2, true, false);
            }
          }
        });
      });

      this.card.addEventListener('click', event => {
        if (event.target.closest('[data-tlx-close]')) {
          event.preventDefault();
          event.stopPropagation();
          this._hideCard();
        }
      });
    }

    _showCard(project, milestone, x, y, pinned, keyboard) {
      this.activeProjectId = project.id;
      this.activeKey = project.id + ':' + (milestone ? milestone.index : 'project');
      this.pinned = Boolean(pinned);
      this.keyboardPinned = Boolean(keyboard);
      this.card.dataset.status = project.statusKey;
      this.card.classList.toggle('is-pinned', this.pinned);
      this.card.setAttribute('aria-hidden', 'false');
      this.card.setAttribute('aria-label', project.name + ' details');

      const milestoneBlock = milestone
        ? '<div class="tlx-card-event">' +
            '<span class="tlx-card-event-type">' + esc(String(milestone.type).toUpperCase()) + '</span>' +
            '<span class="tlx-card-event-name">' + esc(milestone.label) + '</span>' +
            '<span class="tlx-card-event-date">' + fmtMonth(milestone.dateObj) + '</span>' +
          '</div>'
        : '';

      const description = project.description.length > 195
        ? project.description.slice(0, 192).replace(/\s+\S*$/, '') + '…'
        : project.description;

      this.card.innerHTML =
        '<div class="tlx-card-top" data-status="' + project.statusKey + '">' +
          '<span class="tlx-card-status"><span class="tlx-card-status-dot"></span>STATUS: ' + esc(project.statusLabel) + '</span>' +
          '<button class="tlx-card-close" type="button" data-tlx-close aria-label="Close project details">&times;</button>' +
        '</div>' +
        '<h3 class="tlx-card-title">' + esc(project.name) + '</h3>' +
        '<p class="tlx-card-dates">' + esc(fmtRange(project)) + '</p>' +
        milestoneBlock +
        '<p class="tlx-card-desc">' + esc(description) + '</p>' +
        '<div class="tlx-card-foot">' +
          '<span class="tlx-card-category">' + esc(project.category) + '</span>' +
          (project.url ? '<a class="tlx-card-link" href="' + esc(project.url) + '">OPEN DOCUMENTATION &rarr;</a>' : '') +
        '</div>';

      this.card.classList.add('is-visible');

      if (this.pinned && window.innerWidth <= 760) {
        this.card.style.left = '';
        this.card.style.top = '';
      } else {
        this._positionCard(x, y);
      }
    }

    _positionCard(x, y) {
      if (!this.card || !this.card.classList.contains('is-visible')) return;
      const margin = 14;
      const gap = 18;
      const width = this.card.offsetWidth || 330;
      const height = this.card.offsetHeight || 220;

      let left = x + gap;
      let top = y + gap;

      if (left + width > window.innerWidth - margin) left = x - width - gap;
      if (top + height > window.innerHeight - margin) top = y - height - gap;

      this.card.style.left = clamp(left, margin, Math.max(margin, window.innerWidth - width - margin)) + 'px';
      this.card.style.top = clamp(top, margin, Math.max(margin, window.innerHeight - height - margin)) + 'px';
    }

    _hideCard() {
      if (!this.card) return;
      this.card.classList.remove('is-visible', 'is-pinned');
      this.card.setAttribute('aria-hidden', 'true');
      this.card.style.left = '';
      this.card.style.top = '';
      this.pinned = false;
      this.keyboardPinned = false;
      this.activeProjectId = null;
      this.activeKey = null;
    }
  }

  function init() {
    const container = document.getElementById('timeline-main-container');
    if (container) new Timeline('timeline-main-container');
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return { init: init, Timeline: Timeline };
})();
