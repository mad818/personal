'use client'

import { useState } from 'react'
import NewsFeed           from '@/components/signals/NewsFeed'
import HackerNewsFeed     from '@/components/signals/HackerNewsFeed'
import SentimentGauge     from '@/components/signals/SentimentGauge'
import SourceDistribution from '@/components/signals/SourceDistribution'
import TrendingTopics     from '@/components/signals/TrendingTopics'
import { ArticlesLoader } from '@/components/ui/DataLoader'
import PageTransition     from '@/components/ui/PageTransition'
import DataLoadingState   from '@/components/ui/DataLoadingState'
import { useStore }       from '@/store/useStore'

type FeedTab = 'news' | 'hackernews'

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'news',       label: '📰 News' },
  { id: 'hackernews', label: '🟠 Hacker News' },
]

function SignalsContent() {
  const [activeTab, setActiveTab] = useState<FeedTab>('news')
  const articles   = useStore((s) => s.articles)
  const hackerNews = useStore((s) => s.hackerNews)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <ArticlesLoader />

      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>📡 SIGNALS</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          Live news feed · bias detection · Hacker News · sentiment analysis
        </div>
      </div>

      {/* Sentiment gauge — full width at top */}
      <SentimentGauge />

      {/* Source Distribution + Trending Topics — 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <SourceDistribution />
        <TrendingTopics />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              height: '30px', padding: '0 14px', borderRadius: '7px',
              fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
              border: '1px solid var(--border2)',
              background: activeTab === t.id ? 'var(--accent)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text3)',
              transition: 'background .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed content with loading states */}
      {activeTab === 'news' && (
        articles.length === 0
          ? <DataLoadingState dataName="news feed" height={300} />
          : <NewsFeed />
      )}
      {activeTab === 'hackernews' && (
        hackerNews.length === 0
          ? <DataLoadingState dataName="Hacker News" height={300} />
          : <HackerNewsFeed />
      )}
    </div>
  )
}

export default function SignalsPage() {
  return (
    <PageTransition>
      <SignalsContent />
    </PageTransition>
  )
}
