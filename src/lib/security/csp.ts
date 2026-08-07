/**
 * Content-Security-Policy for PlanFlow.
 *
 * PLAN.md §3.7 bans third-party analytics and advertising trackers. The audit of
 * the reference product intercepted 2102 such requests and no business call at
 * all; an HR application must not leak employee-context navigation to ad
 * networks. This policy names no external origin, so any dependency that tries
 * is stopped by the browser.
 *
 * Kept as a pure function so the rule is unit-testable without booting Next.
 * Applied per request in src/proxy.ts.
 */

export interface CspOptions {
  /** Per-request nonce, base64. Next.js needs it for its own inline scripts. */
  nonce: string;
  /** Dev needs 'unsafe-eval' for React Refresh. Never enable it in production. */
  isDevelopment?: boolean;
}

/** Directives that must never name a host other than 'self'. */
export const NETWORK_DIRECTIVES = [
  'default-src',
  'script-src',
  'connect-src',
  'img-src',
  'style-src',
  'font-src',
  'frame-src',
] as const;

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment = false,
}: CspOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Lets modern browsers trust scripts loaded by a nonce-verified script,
    // while older ones fall back to 'self'.
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    // Tailwind injects styles at build time, but React still sets inline
    // style attributes; 'unsafe-inline' for styles carries no script risk.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([directive, values]) =>
      values.length > 0 ? `${directive} ${values.join(' ')}` : directive,
    )
    .join('; ');
}
