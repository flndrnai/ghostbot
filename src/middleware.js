import NextAuth from 'next-auth';
import { authConfig } from './lib/auth/edge-config.js';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Allow public routes
  if (
    pathname.startsWith('/api/') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/invite/')
  ) {
    // Redirect logged-in users away from login page
    if (pathname === '/login' && isLoggedIn) {
      return Response.redirect(new URL('/', req.url));
    }
    return;
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', req.url));
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin') && req.auth?.user?.role !== 'admin') {
    return Response.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|assets).*)'],
};
