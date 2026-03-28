/** @type {import('next').NextConfig} */
module.exports = {
  // Enables `.next/standalone` for Docker / Coolify reproducible deploys (see Dockerfile)
  output: 'standalone',

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
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy
          // Allow: self, trusted CDNs used in the app, inline styles (for React inline styles)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + any CDN libs referenced in artifacts
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://s3.tradingview.com",
              // Styles: self + inline (required for React style props) + unpkg for Leaflet CSS
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              // Images: self + data URIs + https sources (covers Leaflet map tiles + marker icons)
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
                'https://firms.modaps.eosdis.nasa.gov',
                'https://opensky-network.org',
                'https://celestrak.org',
                'https://gpsjam.org',
                'https://finnhub.io',
                'wss://stream.aisstream.io',
                'ws://localhost:*',
                'https://api.anthropic.com',
                'https://s3.tradingview.com',
                'https://www.tradingview.com',
                'http://localhost:*',
              ].join(' '),
              // TradingView MARKETS embeds (legacy StockBot phase) — iframes + widget loader
              "frame-src 'self' https://www.tradingview.com https://*.tradingview.com",
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
