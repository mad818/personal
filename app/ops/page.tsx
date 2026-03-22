'use client'

import dynamic        from 'next/dynamic'
import ConflictFeed   from '@/components/ops/ConflictFeed'
import MarketRates    from '@/components/ops/MarketRates'
import GeoHeatmap     from '@/components/ops/GeoHeatmap'

// Dynamic import keeps Leaflet off the server bundle
const OpsMap = dynamic(() => import('@/components/ops/OpsMap'), { ssr: false })

export default function OpsPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900 }}>🌍 GEOPOLITICAL</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '16px' }}>
        Conflict intelligence · Live earthquake map · FX rates · Commodities · OSINT
      </div>

      {/* Impact heatmap — click any cell to drill into events */}
      <div style={{ marginBottom: '28px' }}>
        <GeoHeatmap />
      </div>

      <ConflictFeed />
      <MarketRates />
      <OpsMap />
    </div>
  )
}
