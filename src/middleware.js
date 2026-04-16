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

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

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
