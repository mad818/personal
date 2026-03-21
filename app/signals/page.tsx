import TopicHeatmap from '@/components/signals/TopicHeatmap'
import { ArticlesLoader } from '@/components/ui/DataLoader'

export default function SignalsPage() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <ArticlesLoader />
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>📡 SIGNALS</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          Topic heatmap · bias detection · click any cell to read
        </div>
      </div>
      <TopicHeatmap />
    </div>
  )
}
