import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * eslint-config-next 16 ships flat configs directly, so no FlatCompat bridge.
 */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      '.pgdata/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // An unused binding is usually a leftover, and a leftover in an
      // authorisation path is a security bug. The _ prefix marks the ones that
      // are deliberate.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
