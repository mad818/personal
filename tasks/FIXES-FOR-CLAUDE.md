# Nexus Prime — Fixes & Improvements Handoff

**Created:** 2026-03-15
**For:** Claude (Anthropic API) — Final Implementation
**From:** PitonRamirez (OpenClaw Agent)

This file contains all identified issues, fixes needed, and improvement recommendations. PitonRamirez can assist with implementation planning, but all final file writes should go through Claude to ensure quality.

---

## 🚨 Critical Fixes (Do These First)

### 1. Missing Environment File
**File:** `.env.local` (does not exist)
**Issue:** Project needs environment variables configured

**Create `.env.local` with:**
```env
# Optional: Groq API key for faster inference
GROQ_API_KEY=your-key-here

# Agent workspace for file operations
AGENT_WORKSPACE=/Users/marioduenas/Desktop/experimentalbot-main/agent-workspace
```

---

### 2. Create Agent Workspace Directory
**Issue:** `agent-workspace` directory doesn't exist (needed for `write_file` tool)

**Fix:**
```bash
mkdir -p /Users/marioduenas/Desktop/experimentalbot-main/agent-workspace
```

---

### 3. Type Safety Issues — `any` Types
**Priority:** Medium
**Files affected:**
- `components/intel/PolymarketFeed.tsx` — line ~30 (raw market data)
- `components/ops/OpsMap.tsx` — lines ~25, ~45 (GeoJSON features, Leaflet map ref)
- `hooks/useCVEs.ts` — lines ~15, ~25, ~30 (CVE metrics, descriptions)
- `hooks/useArticles.ts` — line ~40 (article data)
- `hooks/usePrices.ts` — lines ~35-36 (CoinGecko response)
- `lib/agent.ts` — tool input types (minor)

**Example fix for `usePrices.ts`:**
```typescript
// Before
const mkt: any[] = await mktRes.json()

// After
interface CoinGeckoMarket {
  id: string
  current_price: number
  price_change_percentage_24h: number
  symbol: string
  market_cap: number
  total_volume: number
}

const mkt: CoinGeckoMarket[] = await mktRes.json()
```

---

### 4. Empty Catch Blocks
**Priority:** Low (but bad practice)
**Issue:** Many catch blocks are empty `} catch { }` — should at least log errors

**Files affected:**
- `app/api/tools/route.ts` — 6 empty catches
- `components/intel/PolymarketFeed.tsx`
- `components/intel/StrategyFrameworks.tsx`
- `components/ui/DataLoader.tsx`
- `components/home/HomeChat.tsx`
- `components/ops/ConflictFeed.tsx`
- `components/ops/OpsMap.tsx`
- `components/command/*.tsx` — multiple files
- `lib/agent.ts`

**Example fix:**
```typescript
// Before
} catch {
  return 'Search failed'
}

// After
} catch (error) {
  console.error('[webSearch] Failed:', error)
  return 'Search failed — could not reach search API.'
}
```

---

## 📦 Dependency Updates

**Priority:** Medium (stability/security)

Run `npm outdated` shows 29 packages behind. Key ones:

### High Priority Updates:
| Package | Current | Latest | Risk |
|---------|---------|---------|-------|
| `next` | 14.2.4 | 16.1.6 | Security fixes |
| `react` | 18.3.1 | 19.2.4 | Major version |
| `openai` | 4.104.0 | 6.29.0 | Breaking changes |
| `ai` (Vercel AI SDK) | 3.4.33 | 6.0.116 | Breaking changes |
| `@ai-sdk/openai` | 0.0.34 | 3.0.41 | Breaking changes |
| `zod` | 3.25.76 | 4.3.6 | Major version |
| `zustand` | 4.5.7 | 5.0.11 | Major version |

### Recommended Update Strategy:
1. Create a new branch: `git checkout -b deps-update`
2. Update non-breaking packages first: `pnpm update`
3. Test thoroughly
4. Update major versions one at a time with testing between each
5. Check breaking change notes for each major version

**Note:** The `ai` SDK and `@ai-sdk/openai` packages have significant breaking changes between v3 and v6. The current code uses v3 patterns.

---

## 🔧 Code Quality Improvements

### 1. Add Error Boundary
**Priority:** Medium
**Issue:** No React error boundary — app crashes on component errors

**Create:** `components/ui/ErrorBoundary.tsx`
```tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 20, color: '#ef4444' }}>
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Wrap in `app/layout.tsx`:**
```tsx
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Nav />
          <main>{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

---

### 2. Add Loading States to Pages
**Priority:** Low (UX improvement)
**Issue:** Some pages don't have loading states

**Create:** `app/*/loading.tsx` for each route

**Example `app/home/loading.tsx`:**
```tsx
export default function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontSize: 14, color: 'var(--text3)' }}>Loading…</div>
    </div>
  )
}
```

---

### 3. Extract Magic Numbers/Strings
**Priority:** Low
**Issue:** Hardcoded values scattered throughout

**Create:** `lib/constants.ts`
```typescript
export const COINS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'uniswap'] as const

export const SYM: Record<string, string> = {
  'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL',
  'binancecoin': 'BNB', 'ripple': 'XRP', 'cardano': 'ADA',
  'avalanche-2': 'AVAX', 'polkadot': 'DOT', 'chainlink': 'LINK',
  'uniswap': 'UNI',
}

export const API_ENDPOINTS = {
  coingecko: 'https://api.coingecko.com/api/v3',
  gdelt: 'https://api.gdeltproject.org/api/v2/doc/doc',
  nvd: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
} as const

export const DEFAULT_AI_MODEL = 'claude-opus-4-5-20251101'
export const DEFAULT_LOCAL_MODEL = 'qwen3:14b'
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434/v1/chat/completions'
```

---

### 4. Add React Keys Where Missing
**Priority:** Low (but causes warnings)

Check all `.map()` calls have proper keys. Currently OK, but verify after any changes.

---

## 🚀 Feature Improvements (From TODO.md)

### 1. Momentum Scanner (ALPHA tab) — PLANNED
**Status:** Listed in todo.md as "Next Up"
**Complexity:** Medium

**Implementation needed:**
- Create `components/alpha/MomentumScanner.tsx`
- Add Yahoo Finance screener integration
- Implement `scoreAsset()` function with RSI, BB, EMA, volume, trend
- Add Finnhub fallback for quotes

---

### 2. Telegram Bot Integration — PLANNED
**Status:** Listed in todo.md as "Next Up"
**Complexity:** High

**Would require:**
- Backend route for Telegram webhooks
- User authentication
- Session management
- Message queuing

**Recommendation:** Consider whether this belongs in a client-side-only app. May need a separate backend service.

---

### 3. Cron Scheduler UI — PLANNED
**Status:** Listed in todo.md as "Next Up"
**Complexity:** Medium

**Would require:**
- `setTimeout`/`setInterval` based scheduling (client-side only)
- `localStorage` for persistence
- Notification API for alerts

---

### 4. OTX Threat Feed (CYBER tab) — PLANNED
**Status:** Listed in todo.md as "Next Up"
**Complexity:** Low

**Implementation:**
```typescript
// Add to hooks/useOTX.ts
export function useOTX(apiKey: string | null) {
  // AlienVault OTX API: https://otx.alienvault.com/api/v1/pulses/subscribed
  // Requires apiKey from settings
}
```

---

## 🎨 UI/UX Improvements

### 1. Mobile Responsiveness
**Priority:** Medium
**Issue:** Dashboard designed for desktop, mobile experience may be suboptimal

**Fix:** Add responsive breakpoints in CSS
```css
@media (max-width: 768px) {
  /* Stack tabs vertically */
  /* Reduce padding */
  /* Hide secondary panels */
}
```

---

### 2. Dark Mode Toggle
**Priority:** Low
**Issue:** Only dark theme exists

**Add:** Theme toggle in settings
- Use `next-themes` package (already installed)
- Add CSS variables for light theme
- Store preference in localStorage

---

### 3. Accessibility (A11y)
**Priority:** Low
**Issues:**
- Missing aria labels on interactive elements
- No focus indicators
- Color contrast may not meet WCAG AA

**Add:**
- `aria-label` attributes to buttons
- Focus ring styles
- `alt` text for any images

---

## 🔒 Security Considerations

### 1. API Key Storage
**Current:** Keys stored in localStorage (client-side)
**Risk:** XSS attack could steal keys
**Mitigation:** Keys are user-provided, not hardcoded. Acceptable for personal use.

### 2. CORS Handling
**Current:** All API calls go through `/api/tools` route or directly to public APIs
**Status:** OK — public APIs used are CORS-enabled

### 3. Input Validation
**Issue:** User inputs not validated before use in `calculate` tool
**Fix:** Sanitization already exists but could be stricter:
```typescript
// lib/tools/calculator.ts (improve)
const sanitised = expression.replace(/[^0-9+\-*/().,% ]/g, '')
// Also limit length
if (sanitised.length > 200) return 'Expression too long'
```

---

## 📊 Performance Optimizations

### 1. Bundle Size
**Issue:** Large bundle with all components
**Fix:** Consider dynamic imports for heavy components

```typescript
// Before
import BusinessBuilder from '@/components/command/BusinessBuilder'

// After
const BusinessBuilder = dynamic(() => import('@/components/command/BusinessBuilder'), {
  loading: () => <div>Loading…</div>
})
```

---

### 2. API Caching
**Issue:** CoinGecko API called on every page load
**Fix:** Add stale-while-revalidate caching

```typescript
// In usePrices.ts
const CACHE_KEY = 'nexus-prices-cache'
const CACHE_TTL = 60_000 // 60 seconds

// Check cache before fetching
const cached = localStorage.getItem(CACHE_KEY)
if (cached) {
  const { data, timestamp } = JSON.parse(cached)
  if (Date.now() - timestamp < CACHE_TTL) {
    setPrices(data)
    return
  }
}

// After fetch, cache
localStorage.setItem(CACHE_KEY, JSON.stringify({ data: prices, timestamp: Date.now() }))
```

---

## 📝 Documentation Needs

### 1. Add JSDoc Comments
**Priority:** Low
**Add to:** All exported functions in `lib/` and `hooks/`

```typescript
/**
 * Fetches crypto prices from CoinGecko API
 * @param ids - Comma-separated coin IDs (e.g., 'bitcoin,ethereum')
 * @returns Object mapping coin IDs to price data
 */
export function usePrices() { ... }
```

---

### 2. README Updates
**Current:** README is for original StockBot template
**Needs:** Update to reflect Nexus Prime

**Sections to add:**
- Project overview (intelligence dashboard, not just stock bot)
- Setup instructions for Claude API
- Setup instructions for Ollama
- List of all tabs and features
- API key requirements per feature

---

## ✅ Quick Wins (Easy Fixes)

1. **Add `.env.example` with all required keys** — Done (exists)
2. **Create `agent-workspace` directory** — One command
3. **Add error logging to catch blocks** — Find/replace
4. **Add loading states to pages** — 5 min each
5. **Extract constants to `lib/constants.ts`** — Refactor

---

## 🏗️ Architecture Notes for Claude

### Key Files to Understand:
- `lib/agent.ts` — Core agent loop with tool calling
- `lib/ai.ts` — AI provider abstraction (Claude + Ollama)
- `store/useStore.ts` — Zustand state management
- `app/api/tools/route.ts` — Tool execution API
- `components/home/HomeChat.tsx` — Main chat interface

### Data Flow:
```
User Input → HomeChat.tsx
           → runAgent() (lib/agent.ts)
           → buildSystemPrompt() (lib/ai.ts)
           → AI Provider (Claude or Ollama)
           → Tool Calls → /api/tools
           → Response
```

### Key Patterns:
- All AI calls go through `callAI()` or `runAgent()`
- All state in Zustand store
- All components are client components (`'use client'`)
- No server components currently

---

## 🎯 Recommended Priority Order

1. **Create `.env.local` and `agent-workspace`** — 5 min, unblocks agent
2. **Add error logging to catch blocks** — 15 min, improves debugging
3. **Fix `any` types** — 30 min, improves type safety
4. **Add ErrorBoundary** — 20 min, prevents crashes
5. **Update README** — 30 min, reduces confusion
6. **Add loading states** — 30 min, improves UX
7. **Implement momentum scanner** — 2-4 hours, major feature
8. **Add OTX threat feed** — 1-2 hours, expands CYBER tab
9. **Dependency updates** — 2-4 hours with testing, security/stability

---

## 📋 Files Changed/Created by PitonRamirez

None yet — this is the handoff document. All implementation to be done by Claude.

---

**End of Handoff**

When Claude implements fixes, update `tasks/lessons.md` with any new patterns or issues discovered.