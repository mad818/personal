'use client'

import { useStore } from '@/store/useStore'

// ── HN orange accent ──────────────────────────────────────────────────────────
const HN_ORANGE = '#ff6600'

export default function HackerNewsFeed() {
  const hackerNews = useStore((s) => s.hackerNews)
  const items      = hackerNews.slice(0, 15)

  if (!items.length) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>🟠</div>
        Loading Hacker News…
      </div>
    )
  }

  return (
    <div>
      {/* Feed label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
          background: `${HN_ORANGE}22`, color: HN_ORANGE, letterSpacing: '.4px',
          textTransform: 'uppercase',
        }}>
          Y Combinator · Hacker News
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
          Top {items.length} stories
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {items.map((item: any, i: number) => {
          const title    = item.title ?? ''
          const url      = item.url ?? `https://news.ycombinator.com/item?id=${item.id}`
          const score    = item.score ?? item.points ?? 0
          const comments = item.descendants ?? item.comments ?? 0
          const by       = item.by ?? item.author ?? ''

          return (
            <div key={item.id ?? i} style={{
              background: 'var(--surf2)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '11px 13px',
            }}>
              {/* Rank + title */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, fontSize: '11px', fontWeight: 900,
                  color: HN_ORANGE, fontFamily: 'monospace',
                  minWidth: '20px', paddingTop: '1px',
                }}>
                  {i + 1}
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', flex: 1 }}
                >
                  <div style={{
                    fontSize: '13px', fontWeight: 600, color: 'var(--text)',
                    lineHeight: 1.4, marginBottom: '6px',
                  }}>
                    {title}
                  </div>
                </a>
              </div>

              {/* Meta row: score, comments, author */}
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'center',
                paddingLeft: '30px', flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: HN_ORANGE, display: 'flex', alignItems: 'center', gap: '3px',
                }}>
                  ▲ {score} pts
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
                  💬 {comments}
                </span>
                {by && (
                  <a
                    href={`https://news.ycombinator.com/user?id=${by}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '10px', color: 'var(--text3)', textDecoration: 'none',
                    }}
                  >
                    @{by}
                  </a>
                )}
                <a
                  href={`https://news.ycombinator.com/item?id=${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: 'auto', fontSize: '10px',
                    color: HN_ORANGE, textDecoration: 'none', opacity: 0.7,
                  }}
                >
                  discuss ↗
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
