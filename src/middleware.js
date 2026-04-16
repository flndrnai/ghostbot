import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './lib/auth/edge-config.js';

const { auth } = NextAuth(authConfig);

// Cookie the owner receives after their first trip through /setup.
// Acts as an edge-readable "first shown" flag so we don't have to
// re-redirect them on every login. The DB still holds the authoritative
// SETUP_WIZARD_FIRST_SHOWN_AT stamp — the cookie is just a performance
// hint so middleware can decide without a DB read.
const FIRST_SHOWN_COOKIE = 'gb_setup_seen';

// Tiered rate limits for all /api/* routes. The in-process sliding-window
// store (globalThis.__ghostbotRateLimit) is shared with lib/rate-limit.js
// callers, so per-route handlers that call enforceRateLimit() independently
// still stack correctly. Buckets are keyed by `${ip}:${prefix}` so an IP
// burst on a cheap endpoint doesn't shut out the caller from expensive ones.
const API_RATE_TIERS = [
  // Expensive: LLM / agent / builder / webhook triggers.
  { prefix: '/api/scanner/run',   limit: 10,  windowMs: 60_000 },
  { prefix: '/api/builder',       limit: 20,  windowMs: 60_000 },
  { prefix: '/api/webhook',       limit: 30,  windowMs: 60_000 },
  { prefix: '/api/github/webhook',   limit: 60,  windowMs: 60_000 },
  { prefix: '/api/telegram/webhook', limit: 120, windowMs: 60_000 },
  { prefix: '/api/projects',      limit: 30,  windowMs: 60_000 },
  { prefix: '/api/chat',          limit: 30,  windowMs: 60_000 },
  // Admin reads — fine at a higher cap.
  { prefix: '/api/monitoring',    limit: 120, windowMs: 60_000 },
  { prefix: '/api/containers',    limit: 120, windowMs: 60_000 },
  { prefix: '/api/notifications', limit: 120, windowMs: 60_000 },
  // Default everything else /api/* gets a conservative cap.
];
const API_DEFAULT_LIMIT = 120;
const API_DEFAULT_WINDOW_MS = 60_000;

// NextAuth endpoints are left uncovered — they have their own CSRF /
// brute-force protections and are called by the browser on every auth-state
// check. Applying a cap here causes spurious 429s on login.
const RATE_LIMIT_SKIP_PREFIXES = ['/api/auth/'];

function getClientIpFromReq(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}

// Minimal in-middleware sliding-window check. Reuses the same globalThis
// bucket store that lib/rate-limit.js uses so a user can't bypass the
// cap by alternating between the middleware path and per-route calls.
if (!globalThis.__ghostbotRateLimit) {
  globalThis.__ghostbotRateLimit = { buckets: new Map(), lastSweep: 0 };
}

function applyApiRateLimit(req, pathname) {
  if (RATE_LIMIT_SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const tier = API_RATE_TIERS.find((t) => pathname.startsWith(t.prefix));
  const limit = tier?.limit ?? API_DEFAULT_LIMIT;
  const windowMs = tier?.windowMs ?? API_DEFAULT_WINDOW_MS;
  const bucketPrefix = tier?.prefix ?? '/api/_default';

  const ip = getClientIpFromReq(req);
  const key = `${ip}:${bucketPrefix}`;
  const now = Date.now();
  const store = globalThis.__ghostbotRateLimit;

  const cutoff = now - windowMs;
  let list = store.buckets.get(key);
  if (!list) {
    list = [];
    store.buckets.set(key, list);
  }
  while (list.length > 0 && list[0] < cutoff) list.shift();

  if (list.length >= limit) {
    const oldest = list[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests', retryAfterSec }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }
  list.push(now);
  return null;
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  // Static assets served out of /public must never be auth-gated.
  // Without this the matcher would only skip _next/favicon.ico/assets,
  // so requests like /ghostbot-icon.svg fell into the auth branch and
  // were 307-redirected to /login — breaking every logo/image load on
  // the public landing page.
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$/i.test(pathname)) {
    return;
  }

  // Tiered rate limiting on every /api/* route. Applied before the
  // public-route pass-through so it protects unauthenticated endpoints
  // (webhook receivers) and logged-in endpoints alike.
  if (pathname.startsWith('/api/')) {
    const limited = applyApiRateLimit(req, pathname);
    if (limited) return limited;
  }

  // Public routes
  if (
    pathname.startsWith('/api/') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/invite/')
  ) {
    if (pathname === '/login' && isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return;
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Admin + setup routes require admin role
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/setup')) &&
    user?.role !== 'admin'
  ) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Setup is owner-only
  if (pathname.startsWith('/setup') && user?.owner !== 1) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // First-visit redirect for the owner — only once per browser
  // profile per install, controlled by an edge-readable cookie.
  // The /setup page server component persists the authoritative DB
  // stamp (SETUP_WIZARD_FIRST_SHOWN_AT) and sets this cookie in the
  // response below. If the owner clears cookies they'll be redirected
  // once more — acceptable tradeoff for not touching SQLite from edge.
  if (
    user?.owner === 1 &&
    !pathname.startsWith('/setup') &&
    !req.cookies.get(FIRST_SHOWN_COOKIE)
  ) {
    return NextResponse.redirect(new URL('/setup', req.url));
  }

  // On /setup, stamp the cookie so subsequent non-setup pages don't
  // force-redirect again. DB write happens page-side via markWizardFirstShown.
  if (pathname.startsWith('/setup') && user?.owner === 1) {
    const res = NextResponse.next();
    res.cookies.set(FIRST_SHOWN_COOKIE, '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      // 1 year — the cookie is just a "has this owner seen the wizard" hint.
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|assets).*)'],
};
