/**
 * AARUTHRUN PORTFOLIO — TIMELINE MANAGER MODULE
 * Horizontal Gantt chart with SVG rendering, hover cards, and filtering.
 */

const TimelineManager = (function () {
  'use strict';

  // Config
  const STATUS_COLORS = AppConfig.getTimeline().statusColors;
  const STATUS_LABELS = AppConfig.getTimeline().statusLabels;
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  /**
   * Parse YYYY-MM to Date (first of month)
   */
  function parseYM(str) {
    if (!str) return new Date();
    const [y, m] = str.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  /**
   * Escape HTML
   */
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Format month for display
   */
  function fmtMonth(d) {
    return MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
  }

  /**
   * Get status key
   */
  function statusKey(p) {
    return (p.status || 'completed').toLowerCase();
  }

  /**
   * Get color for status
   */
  function colorOf(p) {
    return STATUS_COLORS[statusKey(p)] || '#111111';
  }

  /**
   * Timeline Gantt chart class
   */
  class GanttChart {
    constructor(containerId, opts = {}) {
      this.el = document.getElementById(containerId);
      if (!this.el) return;

      this.opts = Object.assign({
        isMini: false,
        labelW: 216,
        rowH: 46,
        barH: 18,
        axisH: 36,
        bottomPad: 22,
        padR: 18,
        minPlotW: 620,
        showMeta: true,
        showMilestones: true,
      }, opts);

      this.projects = [];
      this.filtered = [];
      this.zoom = AppConfig.getTimeline().defaultZoom;
      this.fTag = 'ALL';
      this.fSt = 'ALL';
      this.now = new Date();
      this.card = null;

      this._init();
    }

    async _init() {
      // Create hover card for main chart
      if (!this.opts.isMini) {
        let card = document.getElementById('tl-hover-card');
        if (!card) {
          card = document.createElement('div');
          card.id = 'tl-hover-card';
          card.className = 'tl-hover-card';
          document.body.appendChild(card);
        }
        this.card = card;
      }

      try {
        this.projects = await DataStore.getProjects();
        this.filtered = [...this.projects];
        this._bindControls();
        this._render();
        window.addEventListener('resize', () => this._render());
      } catch (e) {
        console.error('[Timeline] Failed to load:', e);
        if (this.el) {
          this.el.innerHTML = '<p class="mono text-muted">Failed to load timeline data.</p>';
        }
      }
    }

    _bindControls() {
      if (this.opts.isMini) return;

      const bind = (sel, attr, fn) => {
        document.querySelectorAll(sel).forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll(sel).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fn(btn.getAttribute(attr));
          });
        });
      };

      bind('[data-timeline-zoom]', 'data-timeline-zoom', v => {
        this.zoom = v;
        this._render();
      });

      bind('[data-tl-tag]', 'data-tl-tag', v => {
        this.fTag = v;
        this._filter();
      });

      bind('[data-tl-status]', 'data-tl-status', v => {
        this.fSt = v;
        this._filter();
      });
    }

    _filter() {
      this.filtered = this.projects.filter(p => {
        const tagOk = this.fTag === 'ALL' ||
          (p.tags || []).some(t => t.toUpperCase() === this.fTag.toUpperCase());
        const stOk = this.fSt === 'ALL' ||
          (p.status || '').toUpperCase() === this.fSt.toUpperCase();
        return tagOk && stOk;
      });
      this._render();
    }

    _domain() {
      const now = this.now;
      const max = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      if (this.zoom === '6M') {
        return { min: new Date(now.getFullYear(), now.getMonth() - 6, 1), max };
      }
      if (this.zoom === '1Y') {
        return { min: new Date(now.getFullYear() - 1, now.getMonth(), 1), max };
      }

      let min = new Date(2024, 0, 1);
      this.projects.forEach(p => {
        const s = parseYM(p.start);
        if (s < min) min = new Date(s);
      });

      return { min, max };
    }

    _render() {
      if (!this.el) return;

      // Mobile list
      if (!this.opts.isMini) {
        this._mobile(this.filtered);
      }

      const projs = this.opts.isMini
        ? this.projects.slice(0, 7)
        : this.filtered;

      if (projs.length === 0) {
        this.el.innerHTML = '<p class="mono text-muted" style="padding:40px;text-align:center">NO PROJECTS MATCH THE SELECTED FILTERS.</p>';
        return;
      }

      this._chart(projs);
      this._events(projs);
    }

    _chart(projs) {
      const o = this.opts;
      const { min: minD, max: maxD } = this._domain();

      // Month ticks
      const months = [];
      const cur = new Date(minD);
      while (cur <= maxD) {
        months.push(new Date(cur));
        cur.setMonth(cur.getMonth() + 1);
      }

      const avail = this.el.clientWidth || 900;
      const W = Math.max(avail, o.labelW + o.minPlotW);
      const plotX = o.labelW + 10;
      const plotW = W - plotX - o.padR;
      const rowsH = projs.length * o.rowH;
      const H = o.axisH + rowsH + o.bottomPad;
      const ruleY = o.axisH - 10;
      const labelY = ruleY - 10;
      const bottomY = o.axisH + rowsH;

      const xOf = d => {
        const t = Math.max(minD.getTime(), Math.min(maxD.getTime(), d.getTime()));
        return plotX + ((t - minD.getTime()) / (maxD.getTime() - minD.getTime())) * plotW;
      };

      let svg = `<svg class="timeline-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Project Gantt chart">`;

      // Axis
      const step = plotW / months.length < 34 ? 3 : 1;
      months.forEach(d => {
        const x = xOf(d);
        const isYr = d.getMonth() === 0;
        const show = isYr || (d.getMonth() % step === 0);
        svg += `<line x1="${x}" y1="${ruleY}" x2="${x}" y2="${bottomY}" stroke="${isYr ? '#D8D8D8' : '#F1F1F1'}" stroke-width="${isYr ? 1.1 : 0.7}"/>`;
        if (show && x + 34 < W) {
          svg += `<text x="${x + 4}" y="${labelY}" font-family="JetBrains Mono,monospace" font-size="${isYr ? 10 : 9}" font-weight="${isYr ? 600 : 400}" fill="${isYr ? '#111' : '#999'}">${isYr ? d.getFullYear() : MONTHS[d.getMonth()]}</text>`;
        }
      });

      // Axis lines
      svg += `<line x1="0" y1="${ruleY}" x2="${W}" y2="${ruleY}" stroke="#111" stroke-width="1"/>`;
      svg += `<line x1="${o.labelW}" y1="${ruleY}" x2="${o.labelW}" y2="${bottomY}" stroke="#111" stroke-width="1"/>`;
      svg += `<text x="0" y="${labelY}" font-family="JetBrains Mono,monospace" font-size="9" fill="#999">PROJECT</text>`;

      // Rows
      projs.forEach((p, i) => {
        const y = o.axisH + i * o.rowH;
        const cy = y + o.rowH / 2;
        const color = colorOf(p);
        const sk = statusKey(p);
        const stLbl = STATUS_LABELS[sk] || (p.status || '').toUpperCase();

        const pStart = parseYM(p.start);
        const pEnd = p.end ? parseYM(p.end) : maxD;
        const range = `${fmtMonth(pStart)} → ${p.end ? fmtMonth(pEnd) : 'NOW'}`;

        const x1 = xOf(pStart);
        const x2 = xOf(pEnd);
        const bw = Math.max(x2 - x1, 6);

        const name = p.shortTitle || p.title;
        const maxChars = Math.max(Math.floor((o.labelW - 44) / 7), 6);
        const lbl = name.length > maxChars ? name.substring(0, maxChars - 1) + '…' : name;

        svg += `<g class="vgantt-row" data-slug="${esc(p.slug)}" data-idx="${i}" style="cursor:pointer">`;

        // Row background + hairline
        svg += `<rect class="vgantt-rowbg" x="0" y="${y}" width="${W}" height="${o.rowH}" fill="transparent"/>`;
        svg += `<line x1="0" y1="${y + o.rowH}" x2="${W}" y2="${y + o.rowH}" stroke="#F0F0F0" stroke-width="1"/>`;

        // Label
        svg += `<circle cx="16" cy="${o.showMeta ? cy - 7 : cy}" r="4" fill="${color}"/>`;
        svg += `<text x="28" y="${o.showMeta ? cy - 4 : cy + 4}" font-family="Inter,sans-serif" font-size="12.5" font-weight="600" fill="#111" pointer-events="none">${esc(lbl)}</text>`;

        if (o.showMeta) {
          svg += `<text x="28" y="${cy + 13}" font-family="JetBrains Mono,monospace" font-size="9" fill="#999" pointer-events="none">${range}</text>`;
          svg += `<text x="${o.labelW - 16}" y="${cy + 13}" font-family="JetBrains Mono,monospace" font-size="9" fill="${color}" text-anchor="end" pointer-events="none">${esc(stLbl)}</text>`;
        }

        // Bar
        svg += `<rect class="vgantt-bar" x="${x1}" y="${cy - o.barH / 2}" width="${bw}" height="${o.barH}" rx="3" fill="${color}"/>`;

        if (!p.end) {
          svg += `<polygon points="${x2 - 2},${cy - 5} ${x2 + 4},${cy} ${x2 - 2},${cy + 5}" fill="${color}"/>`;
        }

        if (o.showMeta && bw >= 90) {
          svg += `<text x="${x1 + bw / 2}" y="${cy - o.barH / 2 - 6}" font-family="JetBrains Mono,monospace" font-size="9" fill="#999" text-anchor="middle" pointer-events="none">${range}</text>`;
        }

        // Milestones
        if (o.showMilestones) {
          const r = o.showMeta ? 5 : 3.5;
          (p.milestones || []).forEach(m => {
            const md = parseYM(m.date);
            if (md < minD || md > maxD) return;
            const mx = xOf(md);
            svg += `<g pointer-events="none"><title>${esc(m.label)} — ${esc(m.date)}</title>` +
                   `<polygon points="${mx},${cy - r} ${mx + r},${cy} ${mx},${cy + r} ${mx - r},${cy}" fill="#fff" stroke="${color}" stroke-width="1.6"/></g>`;
          });
        }

        svg += `</g>`;
      });

      // Today marker
      const tx = xOf(this.now);
      svg += `<line x1="${tx}" y1="${ruleY}" x2="${tx}" y2="${bottomY}" stroke="#0057FF" stroke-width="1.6" stroke-dasharray="5,4" opacity="0.85"/>`;
      svg += `<text x="${tx}" y="${bottomY + (o.showMeta ? 15 : 7)}" font-family="JetBrains Mono,monospace" font-size="9" font-weight="600" fill="#0057FF" text-anchor="middle">TODAY</text>`;

      svg += '</svg>';
      this.el.innerHTML = svg;
    }

    _events(projs) {
      const rows = this.el.querySelectorAll('.vgantt-row');

      rows.forEach(g => {
        const idx = parseInt(g.getAttribute('data-idx'), 10);
        const proj = projs[idx];

        // Click → project page
        g.addEventListener('click', () => {
          if (proj) {
            window.location.href = `project.html?slug=${proj.slug}`;
          }
        });

        if (this.opts.isMini) return;

        // Hover card
        g.addEventListener('mouseenter', e => {
          if (proj) this._showCard(e, proj);
          rows.forEach(r => { r.style.opacity = r === g ? '1' : '0.3'; });
        });

        g.addEventListener('mousemove', e => this._moveCard(e));

        g.addEventListener('mouseleave', () => {
          this._hideCard();
          rows.forEach(r => { r.style.opacity = '1'; });
        });
      });
    }

    _showCard(e, proj) {
      if (!this.card) return;
      const color = colorOf(proj);
      const slbl = STATUS_LABELS[statusKey(proj)] || proj.status;
      const end = proj.end || 'PRESENT';

      const img = proj.image
        ? `<div class="tl-card-img"><img src="${esc(proj.image)}" alt="${esc(proj.title)}" loading="lazy"></div>`
        : '';

      this.card.innerHTML = `
        ${img}
        <div class="tl-card-body">
          <div style="color:${color};font-size:0.68rem;font-family:JetBrains Mono,monospace;margin-bottom:4px">${slbl}</div>
          <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;line-height:1.3">${esc(proj.title)}</div>
          <div style="font-family:JetBrains Mono,monospace;font-size:0.68rem;color:#666;margin-bottom:8px">${esc(proj.start)} → ${esc(end)}</div>
          <div style="font-size:0.78rem;color:#444;line-height:1.5;margin-bottom:8px">${esc((proj.summary || '').substring(0, 110))}${(proj.summary || '').length > 110 ? '…' : ''}</div>
          <div style="font-family:JetBrains Mono,monospace;font-size:0.68rem;color:#0057FF">Click to open →</div>
        </div>
      `;

      this.card.style.display = 'flex';
      this._moveCard(e);
    }

    _moveCard(e) {
      if (!this.card || this.card.style.display === 'none') return;

      const gap = 16;
      const tw = this.card.offsetWidth || 320;
      const th = this.card.offsetHeight || 200;
      let x = e.clientX + gap;
      let y = e.clientY + gap;

      if (x + tw > window.innerWidth - 8) x = e.clientX - tw - gap;
      if (y + th > window.innerHeight - 8) y = e.clientY - th - gap;

      this.card.style.left = `${x + window.scrollX}px`;
      this.card.style.top = `${y + window.scrollY}px`;
    }

    _hideCard() {
      if (this.card) this.card.style.display = 'none';
    }

    _mobile(projs) {
      const holder = document.getElementById('timeline-mobile-list');
      if (!holder) return;

      if (!projs.length) {
        holder.innerHTML = '<p class="mono text-muted">NO PROJECTS MATCH THE SELECTED FILTERS.</p>';
        return;
      }

      const { min: minD, max: maxD } = this._domain();
      const span = maxD.getTime() - minD.getTime();

      const groups = {};
      projs.slice()
        .sort((a, b) => parseYM(a.start) - parseYM(b.start))
        .forEach(p => {
          const yr = String(p.start || '').split('-')[0] || '—';
          (groups[yr] = groups[yr] || []).push(p);
        });

      holder.innerHTML = Object.keys(groups).sort().map(yr => `
        <div class="mobile-time-group">
          <div class="mobile-time-heading">${yr}</div>
          ${groups[yr].map(p => {
            const color = colorOf(p);
            const startT = parseYM(p.start).getTime();
            const endT = p.end ? parseYM(p.end).getTime() : maxD.getTime();
            const w = Math.max(6, Math.round((endT - startT) / span * 100));
            return `
              <a class="mobile-proj-item" href="project.html?slug=${esc(p.slug)}" style="display:block">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:6px;">
                  <span class="mono" style="font-size:0.72rem;color:${color};">${STATUS_LABELS[statusKey(p)] || esc(p.status)}</span>
                  <span class="mono" style="font-size:0.72rem;color:#888;">${esc(p.start)} → ${esc(p.end || 'NOW')}</span>
                </div>
                <div style="font-weight:600;font-size:0.95rem;line-height:1.3;">${esc(p.title)}</div>
                <div style="height:6px;background:${color};margin-top:10px;width:${Math.min(w, 100)}%;"></div>
              </a>
            `;
          }).join('')}
        </div>
      `).join('');
    }

    /**
     * Update zoom level
     */
    setZoom(zoom) {
      this.zoom = zoom;
      this._render();
    }

    /**
     * Update filters
     */
    setFilters(tag, status) {
      this.fTag = tag;
      this.fSt = status;
      this._filter();
    }
  }

  /**
   * Initialize timeline on page
   */
  function init() {
    // Main timeline
    const mainContainer = document.getElementById('timeline-main-container');
    if (mainContainer) {
      new GanttChart('timeline-main-container');
    }

    // Mini timeline (home page preview)
    const miniContainer = document.getElementById('timeline-mini-preview');
    if (miniContainer) {
      new GanttChart('timeline-mini-preview', {
        isMini: true,
        labelW: 200,
        rowH: 26,
        barH: 10,
        axisH: 30,
        bottomPad: 10,
        padR: 12,
        minPlotW: 420,
        showMeta: false,
      });
    }
  }

  // Auto-init
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Public API
  return {
    init,
    GanttChart,
  };
})();
