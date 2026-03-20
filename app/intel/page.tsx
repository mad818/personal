'use client'

// ── app/intel/page.tsx ────────────────────────────────────────────────────────
// NEXUS PRIME — Intel / Tools page with tabbed navigation:
// Prediction Markets | SEC Filings | Flight Tracker | Strategy Frameworks

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PolymarketFeed     from '@/components/intel/PolymarketFeed'
import StrategyFrameworks from '@/components/intel/StrategyFrameworks'
import SECFilingsFeed     from '@/components/intel/SECFilingsFeed'
import FlightTracker      from '@/components/intel/FlightTracker'
import SECActivityChart   from '@/components/intel/SECActivityChart'
import FlightPathViz      from '@/components/intel/FlightPathViz'
import OddsDistribution   from '@/components/intel/OddsDistribution'
import PageTransition     from '@/components/ui/PageTransition'

type Tab = 'markets' | 'sec' | 'flights' | 'strategy'

const TABS: Array<{ id: Tab; label: string; icon: string; desc: string }> = [
  { id: 'markets',  label: 'Prediction Markets', icon: '🎲', desc: 'Polymarket live odds' },
  { id: 'sec',      label: 'SEC Filings',        icon: '📄', desc: 'EDGAR 10-K/10-Q/8-K' },
  { id: 'flights',  label: 'Flight Tracker',     icon: '✈️', desc: 'Live ADS-B data' },
  { id: 'strategy', label: 'Strategy Tools',     icon: '🧰', desc: 'Porter 5F · VRIO · BCG' },
]

function IntelContent() {
  const [activeTab, setActiveTab] = useState<Tab>('markets')

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)' }}>🧰 TOOLS</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          Prediction markets · SEC filings · Live flights · Porter 5 Forces · VRIO · BCG Matrix · JTBD analysis
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '18px',
        padding: '4px',
        background: 'var(--surf2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        flexWrap: 'wrap',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '8px 12px',
                borderRadius: '7px',
                border: `1px solid ${isActive ? 'var(--accent)44' : 'transparent'}`,
                background: isActive ? 'var(--surf3)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text3)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '12px' }}>{tab.icon}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 800 : 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}>
                  {tab.label}
                </span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text3)', opacity: isActive ? 1 : 0.7 }}>
                {tab.desc}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    width: '24px',
                    height: '2px',
                    background: 'var(--accent)',
                    borderRadius: '1px',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'markets' && (
            <>
              <OddsDistribution />
              <PolymarketFeed />
            </>
          )}
          {activeTab === 'sec' && (
            <>
              <SECActivityChart />
              <SECFilingsFeed />
            </>
          )}
          {activeTab === 'flights' && (
            <>
              <FlightPathViz />
              <FlightTracker />
            </>
          )}
          {activeTab === 'strategy' && <StrategyFrameworks />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function IntelPage() {
  return (
    <PageTransition>
      <IntelContent />
    </PageTransition>
  )
}
