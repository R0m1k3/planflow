import { expect, test } from '@playwright/test';

/**
 * The unit tests prove the policy builder is correct. This proves the running
 * application actually sends it — a middleware matcher that quietly stops
 * matching would pass every unit test and ship an unprotected app.
 */
test('les en-têtes de sécurité sont servis par l’application', async ({
  request,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);

  const headers = response.headers();

  const csp = headers['content-security-policy'];
  expect(csp, 'aucune Content-Security-Policy servie').toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src [^;]*'nonce-/);

  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['permissions-policy']).toContain('geolocation=()');

  // Next.js advertises itself by default; there is no reason to tell an
  // attacker which framework and version to look up.
  expect(headers['x-powered-by']).toBeUndefined();
});
