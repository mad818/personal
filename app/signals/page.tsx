import NewsFeed from '@/components/signals/NewsFeed'
import { ArticlesLoader } from '@/components/ui/DataLoader'

export default function SignalsPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <ArticlesLoader />
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>📰 NEWS</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>Live news feed · bias detection · sentiment analysis</div>
      </div>
      <NewsFeed />
    </div>
  )
}
