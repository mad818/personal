'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import SettingsDrawer from '@/components/settings/SettingsDrawer'

const TABS = [
  { href: '/home',    label: '🤖 HOME'    },
  { href: '/command', label: '⚡ COMMAND' },
  { href: '/signals', label: '📡 SIGNALS' },
  { href: '/alpha',   label: '🎯 ALPHA'   },
  { href: '/ops',     label: '🌍 OPS'     },
  { href: '/intel',   label: '📊 INTEL'   },
  { href: '/cyber',   label: '🔒 CYBER'   },
  { href: '/vault',   label: '🗂 VAULT'   },
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
        // Glassmorphism: semi-transparent blur panel
        background:   'rgba(9, 10, 15, 0.82)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        boxShadow:    '0 1px 0 rgba(255,255,255,0.03), 0 2px 20px rgba(0,0,0,.6)',
        display:      'flex',
        alignItems:   'center',
        gap:          '2px',
        padding:      '0 12px',
        zIndex:       1000,
        overflowX:    'auto',
      }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href || (pathname === '/' && tab.href === '/home')
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
                background:     active ? 'rgba(79,110,247,0.18)' : 'transparent',
                color:          active ? '#c5d2ff' : 'var(--text2)',
                transition:     'all 0.15s ease',
                textDecoration: 'none',
                letterSpacing:  '0.2px',
              }}
            >
              {tab.label}
              {/* Active underline glow */}
              {active && (
                <span style={{
                  position:     'absolute',
                  bottom:       '-1px',
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  width:        '60%',
                  height:       '2px',
                  borderRadius: '2px 2px 0 0',
                  background:   'linear-gradient(90deg, transparent, #4f6ef7, transparent)',
                  boxShadow:    '0 0 8px 1px rgba(79,110,247,.7)',
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
