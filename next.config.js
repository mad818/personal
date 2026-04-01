/** @type {import('next').NextConfig} */
module.exports = {
  // Enables `.next/standalone` for Docker / Coolify reproducible deploys (see Dockerfile)
  output: 'standalone',
  poweredByHeader: false,

  // Air-gapped profile: do not allow optimized remote images.
  images: {},

  async redirects() {
    return [
      { source: '/', destination: '/hq', permanent: false },
      { source: '/home', destination: '/hq', permanent: false },
      { source: '/signals', destination: '/labs/signals', permanent: false },
      { source: '/ops', destination: '/labs/ops', permanent: false },
      { source: '/security', destination: '/labs/security', permanent: false },
      { source: '/iot', destination: '/internal/iot', permanent: false },
      { source: '/vehicle', destination: '/internal/vehicle', permanent: false },
      { source: '/skills', destination: '/internal/skills', permanent: false },
      { source: '/reset', destination: '/internal/reset', permanent: false },
    ]
  },

  async rewrites() {
    return [
      { source: '/hq', destination: '/home' },
      { source: '/labs/signals', destination: '/intel?view=news' },
      { source: '/labs/ops', destination: '/intel?view=world' },
      { source: '/labs/security', destination: '/security' },
      { source: '/internal/iot', destination: '/iot' },
      { source: '/internal/vehicle', destination: '/vehicle' },
      { source: '/internal/skills', destination: '/skills' },
      { source: '/internal/reset', destination: '/reset' },
    ]
  },

  // ── Security headers ─────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options',        value: 'DENY' },
          // Block MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Basic XSS filter for older browsers
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
          // Stop referrer leaking entirely
          { key: 'Referrer-Policy',         value: 'no-referrer' },
          // Force HTTPS in production (1 year)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Permissions policy — disable mic/cam/geoloc unless needed
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy (air-gapped)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
