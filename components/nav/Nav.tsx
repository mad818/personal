'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import SettingsDrawer from '@/components/settings/SettingsDrawer'

const TABS = [
  { href: '/command', label: '🏠 DASHBOARD'    },
  { href: '/home',    label: '🤖 AGENT'        },
  { href: '/signals', label: '📰 NEWS'         },
  { href: '/alpha',   label: '📈 MARKETS'      },
  { href: '/ops',     label: '🌍 GEOPOLITICAL' },
  { href: '/cyber',   label: '🔒 CYBER'        },
  { href: '/intel',   label: '🧰 TOOLS'        },
  { href: '/vault',   label: '📁 VAULT'        },
]

export default function Nav() {
  const pathname    = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <nav style={{
        position:     'fixed',
        top:          0,
        left:         0,
        right:        0,
        height:       '48px',
        /* Dark warm glassmorphism */
        background:   'rgba(10, 7, 8, 0.88)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderBottom: '1px solid rgba(196,72,90,0.08)',
        boxShadow:    '0 1px 0 rgba(212,149,106,0.04), 0 2px 20px rgba(0,0,0,.6)',
        display:      'flex',
        alignItems:   'center',
        gap:          '2px',
        padding:      '0 12px',
        zIndex:       1000,
        overflowX:    'auto',
      }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href || (pathname === '/' && tab.href === '/command')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                position:       'relative',
                padding:        '5px 11px',
                borderRadius:   '6px',
                fontSize:       '11.5px',
                fontWeight:     700,
                whiteSpace:     'nowrap',
                background:     active ? 'rgba(196,72,90,0.18)' : 'transparent',
                color:          active ? '#f5d0d6' : 'var(--text2)',
                transition:     'all 0.15s ease',
                textDecoration: 'none',
                letterSpacing:  '0.2px',
              }}
            >
              {tab.label}
              {/* Active underline glow — rose */}
              {active && (
                <span style={{
                  position:     'absolute',
                  bottom:       '-1px',
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  width:        '60%',
                  height:       '2px',
                  borderRadius: '2px 2px 0 0',
                  background:   'linear-gradient(90deg, transparent, #c4485a, transparent)',
                  boxShadow:    '0 0 8px 1px rgba(196,72,90,.7)',
                }} />
              )}
            </Link>
          )
        })}

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            marginLeft:  'auto',
            padding:     '5px 10px',
            borderRadius:'6px',
            fontSize:    '14px',
            background:  'transparent',
            border:      'none',
            color:       'var(--text2)',
            cursor:      'pointer',
            flexShrink:  0,
            transition:  'color 0.15s',
          }}
          title="Settings"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text2)')}
        >
          ⚙️
        </button>
      </nav>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
