/** @type {import('next').NextConfig} */
const devOrigins = ['127.0.0.1', 'localhost']
const distDir = process.env.NEXUS_NEXT_DIST_DIR || '.next'
const skipDuplicateBuildChecks = process.env.NEXUS_NEXT_SKIP_BUILD_CHECKS === '1'

module.exports = {
  // Enables `.next/standalone` for Docker / Coolify reproducible deploys (see Dockerfile)
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  distDir,
  poweredByHeader: false,
  allowedDevOrigins: devOrigins,
  experimental: {
    // Windows local proof can reject Next's webpack worker spawn with EPERM.
    // Keep compiler work in-process to reduce local build-worker failures.
    webpackBuildWorker: false,
  },
  eslint: {
    ignoreDuringBuilds: skipDuplicateBuildChecks,
  },
  typescript: {
    ignoreBuildErrors: skipDuplicateBuildChecks,
  },

  // Air-gapped profile: keep `next/image` rendering without exposing the built-in optimizer.
  images: {
    unoptimized: true,
  },

  async redirects() {
    return [
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
          // Request-specific Content Security Policy is applied in middleware.
          // Prevent tab-napping and Spectre-class cross-origin leaks
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Instruct crawlers not to index local dashboard instances
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}
