import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * PLAN.md §3.7 bans analytics and advertising dependencies outright.
 *
 * The CSP stops such a package at runtime; this stops it at review time, with a
 * message that says why. The audited product carried ten of these, so the
 * failure mode is not hypothetical — it is what happens when nobody is looking.
 */
const BANNED = [
  'segment',
  '@segment/',
  'analytics-node',
  'react-ga',
  'gtag',
  'google-analytics',
  'mixpanel',
  'amplitude',
  'hotjar',
  'clarity-js',
  'satismeter',
  'fullstory',
  'logrocket',
  'bugsnag',
  'sentry',
  'datadog',
  'posthog',
  'heap-analytics',
  'intercom',
];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

describe('dépendances', () => {
  const packageJson: PackageJson = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../package.json', import.meta.url)),
      'utf8',
    ),
  );

  const installed = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];

  it('ne contient aucun traceur publicitaire ou analytique', () => {
    const offenders = installed.filter((name) =>
      BANNED.some((banned) => name.toLowerCase().includes(banned)),
    );

    expect(
      offenders,
      'PLAN.md §3.7 interdit les traceurs tiers dans une application RH. ' +
        "Pour de la télémétrie technique, passer par l'interface abstraite " +
        'auto-hébergée plutôt que par un service externe.',
    ).toEqual([]);
  });
});
