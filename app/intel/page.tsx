import PolymarketFeed       from '@/components/intel/PolymarketFeed'
import StrategyFrameworks   from '@/components/intel/StrategyFrameworks'

export default function IntelPage() {
  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900 }}>🧰 TOOLS</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '16px' }}>
        Prediction markets · Porter 5 Forces · VRIO · BCG Matrix · JTBD analysis
      </div>
      <PolymarketFeed />
      <StrategyFrameworks />
    </div>
  )
}
