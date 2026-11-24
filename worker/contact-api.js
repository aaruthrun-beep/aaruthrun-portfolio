/**
 * AARUTHRUN PORTFOLIO — CONTACT ENDPOINT
 *
 * A single-purpose Worker that turns the static contact form into email via
 * Resend. The Resend API key is a server-side secret (env.RESEND_API_KEY) and
 * never reaches the browser: the page only posts JSON to this origin.
 *
 * Routes:
 *   OPTIONS *        CORS preflight
 *   GET  /           health check: { ok, resendKey }
 *   POST /           { name, email, organization, category, subject, message,
 *                      _honey, _url } -> { success: true } | { success: false, message }
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://aaruthrun-beep.github.io',
  'http://127.0.0.1:8770',
  'http://localhost:8770',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY_BYTES = 24 * 1024;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Best-effort per-isolate throttle. It is not global, but it stops a single
// client from emptying the Resend quota through repeated refreshes.
const hits = new Map();

function allowedOrigins(env) {
  const configured = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(origin, allowed) {
  const headers = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      extraHeaders || {}
    ),
  });
}

function fail(message, status, headers) {
  return json({ success: false, message }, status || 400, headers);
}

function clean(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isRateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound in a long-lived isolate.
  if (hits.size > 500) {
    for (const [entry, times] of hits) {
      if (!times.some((time) => now - time < RATE_WINDOW_MS)) hits.delete(entry);
    }
  }

  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = allowedOrigins(env);
    const headers = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === 'GET') {
      return json({ ok: true, resendKey: Boolean(env.RESEND_API_KEY) }, 200, headers);
    }

    if (request.method !== 'POST') {
      return fail('Use POST to send a message.', 405, headers);
    }

    // A browser always sends Origin on a cross-origin JSON POST. A foreign one
    // means the endpoint is being called from a page that is not this
    // portfolio, so it is refused.
    if (origin && !allowed.includes(origin)) {
      return fail('This endpoint only accepts messages from the portfolio site.', 403, headers);
    }

    const clientKey = request.headers.get('CF-Connecting-IP') || origin || 'unknown';
    if (isRateLimited(clientKey)) {
      return fail('Too many messages from this connection. Please try again later.', 429, headers);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return fail('The message is too long.', 413, headers);
    }

    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch (error) {
      return fail('The message could not be read.', 400, headers);
    }

    // Honeypot: a real visitor never sees this field.
    if (clean(payload._honey, 200)) {
      return fail('The message could not be sent. Please email aaruthrun@gmail.com directly.', 400, headers);
    }

    const name = clean(payload.name, 120);
    const email = clean(payload.email, 200);
    const organization = clean(payload.organization, 120);
    const category = clean(payload.category, 60);
    const subject = clean(payload.subject, 160);
    const message = clean(payload.message, 6000);
    const sourceUrl = clean(payload._url || payload.sourceUrl, 400);

    if (name.length < 2) return fail('Enter your name.', 400, headers);
    if (!EMAIL_PATTERN.test(email)) return fail('Enter a valid email address.', 400, headers);
    if (subject.length < 3) return fail('Add a subject.', 400, headers);
    if (message.length < 20) return fail('Add a little more context to the message.', 400, headers);

    // Secrets pasted from a file can carry a BOM, quotes, a "Bearer " prefix or
    // line breaks; any of those makes an invalid Authorization header and the
    // request throws before it reaches Resend.
    const apiKey = String(env.RESEND_API_KEY || '')
      .replace(/^\uFEFF/, '')
      .replace(/^Bearer\s+/i, '')
      .replace(/["'`\s]/g, '');

    if (!apiKey) {
      return fail('The contact endpoint is not configured yet (missing RESEND_API_KEY).', 500, headers);
    }

    const to = env.CONTACT_TO || 'aaruthrun@gmail.com';
    // onboarding@resend.dev works before a domain is verified and may only
    // deliver to the Resend account owner's own address.
    const from = env.RESEND_FROM || 'Portfolio <onboarding@resend.dev>';
    const emailSubject = 'Portfolio enquiry — ' + (category || 'General') + ': ' + subject;

    const text = [
      message,
      '',
      '—',
      'Name: ' + name,
      'Email: ' + email,
      organization ? 'Organization: ' + organization : '',
      'Purpose: ' + (category || 'Not specified'),
      'Subject: ' + subject,
      sourceUrl ? 'Sent from: ' + sourceUrl : '',
    ]
      .filter(Boolean)
      .join('\n');

    const html = [
      '<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">',
      '<p style="white-space:pre-wrap;margin:0 0 20px">' + escapeHtml(message) + '</p>',
      '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">',
      '<p style="margin:0;font-size:13px;color:#555">',
      '<strong>' + escapeHtml(name) + '</strong> &lt;' + escapeHtml(email) + '&gt;<br>',
      organization ? escapeHtml(organization) + '<br>' : '',
      'Purpose: ' + escapeHtml(category || 'Not specified') + '<br>',
      'Subject: ' + escapeHtml(subject),
      sourceUrl ? '<br>Sent from: ' + escapeHtml(sourceUrl) : '',
      '</p></div>',
    ].join('');

    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email,
          subject: emailSubject,
          text,
          html,
        }),
      });
    } catch (error) {
      return fail('The mail service could not be reached. Please email aaruthrun@gmail.com directly.', 502, headers);
    }

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      // Resend's own wording ("domain is not verified", "API key is invalid")
      // is the only thing that explains the failure to the site owner.
      const reason = data && (data.message || data.error) ? String(data.message || data.error) : '';
      return fail(
        'The message could not be sent' + (reason ? ': ' + reason : '.') +
          ' Please email aaruthrun@gmail.com directly.',
        502,
        headers
      );
    }

    return json({ success: true, id: data && data.id ? data.id : null }, 200, headers);
  },
};
