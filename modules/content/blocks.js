/**
 * AARUTHRUN PORTFOLIO — CONTENT BLOCKS
 * Renders structured content (journal entries, future project sections) without
 * trusting raw HTML. Every string is escaped; only known block types render.
 */

const ContentBlocks = (function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrlValue(value) {
    const url = String(value == null ? '' : value).trim();
    if (!url) return '';
    // Reject control characters, backslash tricks and encoded backslashes.
    if (/[\u0000-\u001F\u007F]/.test(url)) return '';
    if (url.indexOf('\\') !== -1 || /%5c/i.test(url)) return '';
    if (/^https?:/i.test(url)) {
      return /^https?:\/\//i.test(url) ? url : '';
    }
    if (/^mailto:/i.test(url)) return url;
    // Reject any other scheme, including javascript:, data: and vbscript:.
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
    // Protocol-relative URLs can escape the site origin.
    if (url.charAt(0) === '/' && (url.charAt(1) === '/' || url.charAt(1) === '\\')) return '';
    if (url.charAt(0) === '\\') return '';
    return url;
  }

  function safeUrl(value) {
    const url = safeUrlValue(value);
    return url ? esc(url) : '';
  }

  // tools/build-responsive.mjs writes these derivatives. The convention is
  // shared with the project renderers and the gallery build: keep them in
  // sync. Returns '' for remote or non-project sources so callers can fall
  // back to a plain src without offering candidates that do not exist.
  function srcset(value, widths) {
    const url = safeUrlValue(value);
    if (!url || !/^images\/(projects|selected|home)\//.test(url)) return '';
    if (!/\.(jpe?g|png|webp)$/i.test(url)) return '';
    const sizes = Array.isArray(widths) && widths.length ? widths : [800, 1600];
    const base = url
      .replace(/^images\//, 'images/derived/')
      .replace(/\.(jpe?g|png|webp)$/i, '');
    return sizes.map(function (width) {
      return encodeURI(base + '-' + width + '.jpg') + ' ' + width + 'w';
    }).join(', ');
  }

  function renderImage(image) {
    if (!image || !image.src) return '';
    const src = safeUrl(image.src);
    if (!src) return '';
    const alt = image.alt || image.caption || '';
    const caption = image.caption
      ? '<figcaption>' + esc(image.caption) + '</figcaption>'
      : '';
    return (
      '<figure class="entry-figure">' +
      '<img src="' + src + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
      caption +
      '</figure>'
    );
  }

  function renderImageGrid(block) {
    const images = (block.images || []).map(renderImage).filter(Boolean);
    if (!images.length) return '';
    return '<div class="entry-figure-grid' +
      (images.length === 2 ? ' is-pair' : '') + '">' + images.join('') + '</div>';
  }

  function renderTable(block) {
    const head = (block.head || []).map(function (cell) {
      return '<th scope="col">' + esc(cell) + '</th>';
    }).join('');
    const rows = (block.rows || []).map(function (row) {
      const cells = Array.isArray(row) ? row : (row.cells || []);
      return '<tr>' + cells.map(function (cell) {
        return '<td>' + esc(cell) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    if (!head && !rows) return '';
    return (
      '<figure class="entry-table">' +
      '<div class="entry-table-scroll"><table>' +
      (head ? '<thead><tr>' + head + '</tr></thead>' : '') +
      '<tbody>' + rows + '</tbody></table></div>' +
      (block.caption ? '<figcaption>' + esc(block.caption) + '</figcaption>' : '') +
      '</figure>'
    );
  }

  const CODE_KEYWORDS = {
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while',
    cpp: 'auto break case char const constexpr continue default delete do double else enum explicit extern false float for friend if inline int long namespace new nullptr private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while',
    python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield',
    javascript: 'async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield'
  };

  function normaliseLanguage(language) {
    const value = String(language || '').toLowerCase();
    if (value === 'js' || value === 'jsx') return 'javascript';
    if (value === 'ts' || value === 'tsx') return 'javascript';
    if (value === 'py') return 'python';
    if (value === 'c++') return 'cpp';
    return value;
  }

  /**
   * A deliberately small tokeniser for the languages used in Field Notes.
   * It escapes every token before wrapping it, so code can never become HTML.
   */
  function highlightCode(code, language) {
    const lang = normaliseLanguage(language);
    const keywords = new Set((CODE_KEYWORDS[lang] || '').split(' ').filter(Boolean));
    if (!keywords.size) return esc(code);

    const hashComment = lang === 'python' || lang === 'shell' || lang === 'bash';
    const pattern = new RegExp(
      '(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*' +
      (hashComment ? '|#[^\\n]*' : '') +
      '|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`' +
      '|\\b[A-Za-z_]\\w*\\b|\\b\\d+(?:\\.\\d+)?\\b)',
      'g'
    );

    let html = '';
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const token = match[0];
      html += esc(code.slice(lastIndex, match.index));
      let cls = '';
      if (token.indexOf('//') === 0 || token.indexOf('/*') === 0 || token.charAt(0) === '#') {
        cls = 'tok-c';
      } else if (/^["'`]/.test(token)) {
        cls = 'tok-s';
      } else if (/^\d/.test(token)) {
        cls = 'tok-n';
      } else if (keywords.has(token)) {
        cls = 'tok-k';
      }
      html += cls ? '<span class="' + cls + '">' + esc(token) + '</span>' : esc(token);
      lastIndex = match.index + token.length;
    }
    html += esc(code.slice(lastIndex));
    return html;
  }

  function renderCode(block) {
    if (!block.code) return '';
    return (
      '<div class="entry-code">' +
      (block.filename ? '<div class="entry-code-head">' + esc(block.filename) + '</div>' : '') +
      '<pre><code' + (block.language ? ' data-language="' + esc(normaliseLanguage(block.language)) + '"' : '') + '>' +
      highlightCode(block.code, block.language) + '</code></pre></div>'
    );
  }

  function renderReferences(block) {
    const items = (block.items || []).filter(function (item) { return item && item.label; });
    if (!items.length) return '';
    return (
      '<section class="entry-refs">' +
      '<h3 class="entry-refs-title">' + esc(block.title || 'References') + '</h3>' +
      '<ol>' + items.map(function (item) {
        const url = safeUrl(item.url);
        const label = esc(item.label);
        return '<li>' + (url
          ? '<a href="' + url + '" target="_blank" rel="noopener">' + label + ' &nearr;</a>'
          : '<span>' + label + ' <em class="placeholder-inline">link not recorded</em></span>') +
          (item.note ? ' — ' + esc(item.note) : '') + '</li>';
      }).join('') + '</ol></section>'
    );
  }

  function render(blocks) {
    if (!Array.isArray(blocks)) return '';
    return blocks.map(function (block) {
      if (!block || !block.type) return '';
      switch (block.type) {
        case 'paragraph':
          return block.text ? '<p>' + esc(block.text) + '</p>' : '';
        case 'heading':
          var level = Math.min(3, Math.max(2, Number(block.level) || 2));
          var headingId = block.id ? ' id="' + esc(block.id) + '"' : '';
          return block.text ? '<h' + level + headingId + '>' + esc(block.text) + '</h' + level + '>' : '';
        case 'list':
          var tag = block.ordered ? 'ol' : 'ul';
          var items = (block.items || []).filter(Boolean).map(function (item) {
            return '<li>' + esc(item) + '</li>';
          }).join('');
          return items ? '<' + tag + ' class="entry-list">' + items + '</' + tag + '>' : '';
        case 'image':
          return renderImage(block);
        case 'image-grid':
          return renderImageGrid(block);
        case 'table':
          return renderTable(block);
        case 'code':
          return renderCode(block);
        case 'callout':
          return (block.title || block.text)
            ? '<aside class="entry-callout">' +
              (block.title ? '<div class="entry-callout-title">' + esc(block.title) + '</div>' : '') +
              (block.text ? '<p>' + esc(block.text) + '</p>' : '') + '</aside>'
            : '';
        case 'quote':
          return block.text
            ? '<blockquote class="entry-quote"><p>' + esc(block.text) + '</p>' +
              (block.attribution ? '<cite>' + esc(block.attribution) + '</cite>' : '') +
              '</blockquote>'
            : '';
        case 'video':
          var videoUrl = safeUrl(block.url);
          if (!videoUrl) return '';
          if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(block.url)) {
            return (
              '<figure class="entry-video-embed">' +
              '<video controls preload="metadata" src="' + videoUrl + '"></video>' +
              (block.title ? '<figcaption>' + esc(block.title) + '</figcaption>' : '') +
              '</figure>'
            );
          }
          return '<a class="entry-video" href="' + videoUrl + '" target="_blank" rel="noopener">' +
            '<span class="entry-video-label">' + esc(block.label || 'Video') + '</span>' +
            '<span class="entry-video-title">' + esc(block.title || block.url) + ' &nearr;</span></a>';
        case 'references':
          return renderReferences(block);
        case 'divider':
          return '<hr class="entry-rule">';
        default:
          return '';
      }
    }).join('\n');
  }

  return { render: render, esc: esc, safeUrl: safeUrl, safeUrlValue: safeUrlValue, srcset: srcset };
})();
