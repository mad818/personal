# TradingView sandbox boundary

Nexus keeps the ALPHA ticker tape and BTC chart, but it does not execute their
provider bootstrap scripts in the Nexus document. Both widgets load through
the fixed local route `/embeds/tradingview` inside an opaque-origin iframe.

## Why Nexus does not pin a one-time SRI hash

TradingView's official documentation describes its classic iframe widgets as
standard external scripts that inject an iframe:

- [Widget formats](https://www.tradingview.com/widget-docs/widget-formats/)
- [Advanced chart](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)
- [Legacy ticker tape](https://www.tradingview.com/widget-docs/widgets/tickers/legacy-ticker-tape/)

The published script URLs are not versioned. Nexus therefore treats it as an
inference that a fixed SRI hash would be operationally brittle: any provider
update at the same URL would fail closed and remove the charts. Sandboxing gives
the remote code substantially less authority without representing a mutable
resource as immutable.

## Containment model

The parent iframe grants only:

```text
allow-scripts allow-popups allow-popups-to-escape-sandbox
```

It intentionally omits `allow-same-origin`, forms, top navigation, downloads,
storage access, modals, orientation/pointer locks, and presentation escape. The
iframe also uses `referrerPolicy="no-referrer"` and lazy loading.

The child response repeats the sandbox in CSP, adds `frame-ancestors 'self'`,
and receives `X-Frame-Options: SAMEORIGIN`. All other Nexus responses retain
`X-Frame-Options: DENY`. The child CSP alone authorizes TradingView's bootstrap,
image, and frame hosts; normal Nexus pages do not carry those script or frame
allowances.

The local route accepts only `ticker` and `chart`. Script URLs, symbols,
configuration, and theme are repository-owned constants. The server does not
contact TradingView, proxy provider bytes, accept a provider URL, or interpolate
query data into HTML. The browser requests the provider only when the operator
opens the charts view and the lazy iframe becomes eligible to load.

## Verification

Run the focused gate:

```powershell
npm run security:tradingview
```

After a production build, the existing HTTP acceptance gate also checks both
widget documents:

```powershell
npm run build
npm run security:csp:production:check
```

That proof checks route-scoped hosts, nonce agreement, CSP sandbox tokens,
absence of `allow-same-origin`, framing headers, invalid-kind rejection,
default-policy host removal, and temporary server cleanup. Canonical
`npm run verify` includes the focused TradingView gate.

## Honest boundary

Sandboxing contains provider code; it does not prove that provider content is
correct or untampered. The frame may display provider-controlled UI and may open
an explicit user-initiated TradingView popup. Nexus does not vendor or
self-host TradingView code and does not claim durable SRI for its mutable URLs.
