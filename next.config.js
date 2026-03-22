/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**',
      },
    ],
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
          // Stop referrer leaking to external sites
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          // Force HTTPS in production (1 year)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Permissions policy — disable mic/cam/geoloc unless needed
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          // Allow: self, trusted CDNs used in the app, inline styles (for React inline styles)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + any CDN libs referenced in artifacts
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com",
              // Styles: self + inline (required for React style props)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + data URIs + https sources
              "img-src 'self' data: https: blob:",
              // Fonts: self
              "font-src 'self'",
              // API calls: self + the external data sources Nexus uses
              [
                "connect-src 'self'",
                'https://api.coingecko.com',
                'https://api.alternative.me',
                'https://api.stlouisfed.org',
                'https://gamma-api.polymarket.com',
                'https://services.swpc.noaa.gov',
                'https://earthquake.usgs.gov',
                'https://opensky-network.org',
                'https://celestrak.org',
                'https://gpsjam.org',
                'https://finnhub.io',
                'wss://stream.aisstream.io',
                'ws://localhost:*',
                'https://api.anthropic.com',
                'http://localhost:*',
              ].join(' '),
              // Frames: none
              "frame-src 'none'",
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
