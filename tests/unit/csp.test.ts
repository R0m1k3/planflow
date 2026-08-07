import { describe, expect, it } from 'vitest';

import {
  buildContentSecurityPolicy,
  NETWORK_DIRECTIVES,
} from '@/lib/security/csp';

function parse(policy: string): Map<string, string[]> {
  return new Map(
    policy.split('; ').map((directive) => {
      const [name, ...values] = directive.split(' ');
      return [name ?? '', values];
    }),
  );
}

/** Any source that is neither a keyword, a nonce, nor a safe scheme. */
function externalOrigins(values: string[]): string[] {
  return values.filter((value) => {
    if (value.startsWith("'")) return false; // 'self', 'none', 'nonce-…', …
    if (value === 'blob:' || value === 'data:') return false;
    return true;
  });
}

describe('Content-Security-Policy', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'dGVzdC1ub25jZQ==' });
  const directives = parse(policy);

  it('names no external origin on any network directive', () => {
    // PLAN.md §3.7 — the audited product shipped Segment, LinkedIn Ads, Google
    // Ads, DoubleClick, Clarity, Hotjar and Bugsnag. This assertion is what
    // keeps that from creeping back in as a "small" addition.
    for (const directive of NETWORK_DIRECTIVES) {
      const values = directives.get(directive) ?? [];
      expect(
        externalOrigins(values),
        `${directive} autorise une origine tierce`,
      ).toEqual([]);
    }
  });

  it('carries the request nonce on script-src', () => {
    expect(directives.get('script-src')).toContain("'nonce-dGVzdC1ub25jZQ=='");
  });

  it('never allows unsafe-eval outside development', () => {
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('allows unsafe-eval in development only, for React Refresh', () => {
    const devPolicy = buildContentSecurityPolicy({
      nonce: 'dGVzdA==',
      isDevelopment: true,
    });
    expect(devPolicy).toContain("'unsafe-eval'");
  });

  it('forbids inline scripts, framing and object embedding', () => {
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'");
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
  });
});
