import { NextResponse, type NextRequest } from 'next/server';

import { buildContentSecurityPolicy } from '@/lib/security/csp';

/**
 * Emits a per-request nonce and the Content-Security-Policy built from it.
 *
 * PLAN.md §3.7 forbids third-party trackers. A policy that names no external
 * origin is what makes that rule enforceable rather than merely stated: a
 * dependency that starts phoning home is blocked by the browser instead of
 * quietly succeeding.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === 'development',
  });

  // Server Components read the nonce from the request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, which need no policy of their own.
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
