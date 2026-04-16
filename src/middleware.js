import NextAuth from 'next-auth';
import { authConfig } from './lib/auth/edge-config.js';

const { auth } = NextAuth(authConfig);

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
      return Response.redirect(new URL('/', req.url));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', req.url));
  }

  // Admin + setup routes require admin role
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/setup')) &&
    user?.role !== 'admin'
  ) {
    return Response.redirect(new URL('/', req.url));
  }

  // Setup is owner-only
  if (pathname.startsWith('/setup') && user?.owner !== 1) {
    return Response.redirect(new URL('/admin', req.url));
  }

  // First-visit redirect for the owner — only once per install.
  // We cannot touch the DB from edge middleware, so we defer the
  // actual redirect decision to the server component of each page.
  // Middleware only enforces route protection here.
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|assets).*)'],
};
