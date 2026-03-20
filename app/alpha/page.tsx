import PriceGrid        from '@/components/alpha/PriceGrid'
import MomentumScanner  from '@/components/alpha/MomentumScanner'
import BuyBot           from '@/components/alpha/BuyBot'
import PositionSizer    from '@/components/alpha/PositionSizer'
import WatchlistManager from '@/components/alpha/WatchlistManager'
import FearGreedGauge   from '@/components/alpha/FearGreedGauge'
import DefiOverview     from '@/components/alpha/DefiOverview'
import PriceSparklines  from '@/components/alpha/PriceSparklines'
import { PricesLoader } from '@/components/ui/DataLoader'

export default function AlphaPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <PricesLoader />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>📈 MARKETS</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          Crypto · Momentum scanner · Buy signals · Position sizing · Price tracking
        </div>
      </div>

      {/* Price Sparklines — new visualization */}
      <div style={{ marginBottom: '20px' }}>
        <PriceSparklines />
      </div>

      {/* Watchlist manager — compact toggle */}
      <div style={{ marginBottom: '16px' }}>
        <WatchlistManager />
      </div>

      {/* Buy Bot — AI-powered buy/sell signals */}
      <div style={{ marginBottom: '28px' }}>
        <BuyBot />
      </div>

      {/* Momentum Scanner — ranked signal list */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.8px', marginBottom: '10px',
        }}>
          Momentum Signals
        </div>
        <MomentumScanner />
      </div>

      {/* Position Sizer */}
      <div style={{ marginBottom: '28px' }}>
        <PositionSizer />
      </div>

      {/* Fear & Greed + DeFi Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        <FearGreedGauge />
        <DefiOverview />
      </div>

      {/* Price Grid — full card view with sparklines */}
      <div>
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.8px', marginBottom: '10px',
        }}>
          Price Overview
        </div>
        <PriceGrid />
      </div>
    </div>
  )
}
