import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Docker image: ship only what the server needs.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  // Security headers that do not need a per-request nonce.
  // The Content-Security-Policy is set in src/proxy.ts because it does.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // No browser feature in this app needs these. Denying them keeps a
          // future dependency from silently reaching for a camera or a GPS fix.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
