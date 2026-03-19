'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { DEFAULT_COINS } from '@/hooks/usePrices'

// Popular coin suggestions with CoinGecko IDs
const SUGGESTIONS = [
  { id: 'dogecoin',      sym: 'DOGE' },
  { id: 'shiba-inu',     sym: 'SHIB' },
  { id: 'litecoin',      sym: 'LTC'  },
  { id: 'stellar',       sym: 'XLM'  },
  { id: 'cosmos',        sym: 'ATOM' },
  { id: 'near',          sym: 'NEAR' },
  { id: 'the-sandbox',   sym: 'SAND' },
  { id: 'arbitrum',      sym: 'ARB'  },
  { id: 'optimism',      sym: 'OP'   },
  { id: 'pepe',          sym: 'PEPE' },
  { id: 'injective-protocol', sym: 'INJ' },
  { id: 'sui',           sym: 'SUI'  },
  { id: 'aptos',         sym: 'APT'  },
  { id: 'render-token',  sym: 'RNDR' },
  { id: 'fetch-ai',      sym: 'FET'  },
]

export default function WatchlistManager() {
  const watchlist      = useStore((s) => s.settings.watchlist) as string[]
  const updateSettings = useStore((s) => s.updateSettings)

  const [input,  setInput]  = useState('')
  const [open,   setOpen]   = useState(false)

  const allCustom = watchlist.filter((id) => !DEFAULT_COINS.includes(id))

  const addCoin = (id: string) => {
    const clean = id.toLowerCase().trim()
    if (!clean || watchlist.includes(clean) || DEFAULT_COINS.includes(clean)) return
    updateSettings({ watchlist: [...watchlist, clean] })
    setInput('')
  }

  const removeCoin = (id: string) => {
    updateSettings({ watchlist: watchlist.filter((c) => c !== id) })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          height: '28px', padding: '0 14px', borderRadius: '7px',
          background: 'transparent', border: '1px solid var(--border2)',
          color: 'var(--text3)', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}
      >
        <span>⚙</span> Watchlist {allCustom.length > 0 ? `(+${allCustom.length})` : ''}
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--surf2)', border: '1px solid var(--border2)',
      borderRadius: '10px', padding: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
          ⚙ Crypto Watchlist
        </span>
        <button onClick={() => setOpen(false)} style={{
          background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px',
        }}>×</button>
      </div>

      {/* Default coins — locked */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
          Default (always tracked)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {DEFAULT_COINS.map((id) => (
            <span key={id} style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
              background: 'var(--surf3)', color: 'var(--text3)', border: '1px solid var(--border)',
            }}>
              {id.toUpperCase().replace(/-/g, ' ').slice(0, 12)}
            </span>
          ))}
        </div>
      </div>

      {/* Custom coins */}
      {allCustom.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
            Your additions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {allCustom.map((id) => (
              <button key={id} onClick={() => removeCoin(id)} style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(79,110,247,.15)', color: 'var(--accent)',
                border: '1px solid rgba(79,110,247,.3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                {id} <span style={{ fontSize: '9px', opacity: .7 }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add custom */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCoin(input)}
          placeholder="CoinGecko ID (e.g. dogecoin, sui, pepe)…"
          style={{
            flex: 1, background: 'var(--surf3)', border: '1px solid var(--border2)',
            borderRadius: '6px', color: 'var(--text)', fontSize: '11.5px',
            padding: '6px 10px', outline: 'none',
          }}
        />
        <button onClick={() => addCoin(input)} style={{
          height: '32px', padding: '0 14px', borderRadius: '6px',
          background: 'var(--accent)', border: 'none', color: '#fff',
          fontSize: '11px', fontWeight: 700, cursor: 'pointer',
        }}>
          Add
        </button>
      </div>

      {/* Quick suggestions */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
          Quick add
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {SUGGESTIONS.filter((s) => !watchlist.includes(s.id) && !DEFAULT_COINS.includes(s.id)).map((s) => (
            <button key={s.id} onClick={() => addCoin(s.id)} style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
              background: 'transparent', color: 'var(--text3)',
              border: '1px solid var(--border2)', cursor: 'pointer',
            }}>
              + {s.sym}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text3)', lineHeight: 1.5 }}>
        Use CoinGecko IDs (lowercase, hyphenated). New coins appear in Price Overview after the next refresh.
      </div>
    </div>
  )
}
