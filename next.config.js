/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV !== 'production'
const devPort = process.env.PORT || '3000'
const devOrigins = ['127.0.0.1', 'localhost']
const devSockets = [`ws://127.0.0.1:${devPort}`, `ws://localhost:${devPort}`]
const distDir = process.env.NEXUS_NEXT_DIST_DIR || '.next'

function buildCsp() {
  const scriptSrc = ["script-src 'self'", "'unsafe-inline'"]
  const styleSrc = ["style-src 'self'", "'unsafe-inline'"]
  const connectSrc = [
    "connect-src 'self'",
    "https://api.coingecko.com",
    "https://services.nvd.nist.gov",
    "https://api.alternative.me",
    "https://mempool.space",
    "https://dns.google",
    "https://rdap.org",
    "https://crt.sh",
    "https://ipapi.co",
    "https://api.hackertarget.com",
    "https://www.circl.lu",
    "https://emailrep.io",
    "https://api.github.com",
    "https://www.gravatar.com",
    "https://check.torproject.org",
    "https://haveibeenpwned.com",
    "https://www.virustotal.com",
    "https://api.shodan.io",
    "https://api.stlouisfed.org",
  ]
  const imgSrc = [
    "img-src 'self' data: blob:",
    "https://*.basemaps.cartocdn.com",
    "https://www.tradingview.com",
    "https://s3.tradingview.com",
  ]
  const frameSrc = [
    "frame-src 'self'",
    "https://www.tradingview.com",
    "https://s.tradingview.com",
  ]

  if (isDevelopment) {
    scriptSrc.push("'unsafe-eval'")
    connectSrc.push(...devSockets)
  }

  scriptSrc.push("https://s3.tradingview.com")

  return [
    "default-src 'self'",
    scriptSrc.join(' '),
    styleSrc.join(' '),
    imgSrc.join(' '),
    "font-src 'self' data:",
    connectSrc.join(' '),
    frameSrc.join(' '),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

module.exports = {
  // Enables `.next/standalone` for Docker / Coolify reproducible deploys (see Dockerfile)
  output: 'standalone',
  distDir,
  poweredByHeader: false,
  allowedDevOrigins: devOrigins,

  // Air-gapped profile: do not allow optimized remote images.
  images: {},

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
          // Content Security Policy (air-gapped)
          {
            key: 'Content-Security-Policy',
            value: buildCsp(),
          },
        ],
      },
    ]
  },
}
