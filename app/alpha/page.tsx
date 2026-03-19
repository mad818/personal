import PriceGrid        from '@/components/alpha/PriceGrid'
import MomentumScanner  from '@/components/alpha/MomentumScanner'
import BuyBot           from '@/components/alpha/BuyBot'
import PositionSizer    from '@/components/alpha/PositionSizer'
import WatchlistManager from '@/components/alpha/WatchlistManager'
import { PricesLoader } from '@/components/ui/DataLoader'

export default function AlphaPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <PricesLoader />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>🎯 ALPHA</div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
          Buy Bot · Momentum scanner · Position sizing · 7-day trend
        </div>
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
