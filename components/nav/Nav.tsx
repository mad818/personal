'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SettingsDrawer from '@/components/settings/SettingsDrawer'
import NotificationCenter from '@/components/ui/NotificationCenter'
import { useStore } from '@/store/useStore'

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { href: '/command',  label: 'DASHBOARD',    icon: '🏠', group: 0 },
  { href: '/home',     label: 'AGENT',        icon: '🤖', group: 0 },
  { href: '/signals',  label: 'NEWS',         icon: '📰', group: 1 },
  { href: '/alpha',    label: 'MARKETS',      icon: '📈', group: 1 },
  { href: '/ops',      label: 'GEOPOLITICAL', icon: '🌍', group: 1 },
  { href: '/cyber',    label: 'CYBER',        icon: '🔒', group: 1 },
  { href: '/security', label: 'SECURITY',     icon: '📹', group: 2 },
  { href: '/iot',      label: 'IoT',          icon: '📡', group: 2 },
  { href: '/vehicle',  label: 'VEHICLE',      icon: '🚗', group: 2 },
  { href: '/skills',   label: 'SKILLS',       icon: '🧠', group: 3 },
  { href: '/intel',    label: 'TOOLS',        icon: '🧰', group: 3 },
  { href: '/vault',    label: 'VAULT',        icon: '📁', group: 3 },
]

const SIDEBAR_EXPANDED  = 220
const SIDEBAR_COLLAPSED = 56

const STYLES = {
  sidebar: (collapsed: boolean): React.CSSProperties => ({
    position:        'fixed',
    top:             0,
    left:            0,
    bottom:          0,
    width:           collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
    background:      'rgba(10, 7, 8, 0.92)',
    backdropFilter:  'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRight:     '1px solid rgba(196,72,90,0.10)',
    boxShadow:       '2px 0 24px rgba(0,0,0,0.7), 1px 0 0 rgba(212,149,106,0.04)',
    display:         'flex',
    flexDirection:   'column',
    zIndex:          1000,
    transition:      'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow:        'hidden',
  }),

  logo: (collapsed: boolean): React.CSSProperties => ({
    padding:        collapsed ? '20px 0' : '20px 16px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap:            '10px',
    borderBottom:   '1px solid rgba(196,72,90,0.08)',
    flexShrink:     0,
    minHeight:      '64px',
  }),

  logoMark: (): React.CSSProperties => ({
    width:          '32px',
    height:         '32px',
    borderRadius:   '8px',
    background:     'linear-gradient(135deg, #6b1d2a 0%, #c4485a 100%)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '16px',
    fontWeight:     900,
    color:          '#fff',
    letterSpacing:  '-0.5px',
    flexShrink:     0,
    boxShadow:      '0 0 12px rgba(196,72,90,0.3)',
  }),

  logoText: (): React.CSSProperties => ({
    fontWeight:     900,
    fontSize:       '13px',
    letterSpacing:  '2px',
    textTransform:  'uppercase' as const,
    background:     'linear-gradient(135deg, #f5e6ea, #c4485a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor:  'transparent',
    whiteSpace:     'nowrap' as const,
  }),

  navScroll: (): React.CSSProperties => ({
    flex:       1,
    overflowY:  'auto' as const,
    overflowX:  'hidden',
    padding:    '8px 0',
    scrollbarWidth: 'none' as const,
  }),

  divider: (): React.CSSProperties => ({
    height:     '1px',
    background: 'rgba(196,72,90,0.08)',
    margin:     '6px 12px',
  }),

  tabLink: (active: boolean, collapsed: boolean): React.CSSProperties => ({
    position:       'relative',
    display:        'flex',
    alignItems:     'center',
    gap:            '10px',
    padding:        collapsed ? '10px 0' : '10px 14px',
    margin:         '1px 6px',
    borderRadius:   '8px',
    background:     active ? 'rgba(196,72,90,0.18)' : 'transparent',
    color:          active ? '#f5d0d6' : 'rgba(184,169,158,0.85)',
    textDecoration: 'none',
    fontSize:       '11px',
    fontWeight:     700,
    letterSpacing:  '0.8px',
    textTransform:  'uppercase' as const,
    transition:     'background 0.15s ease, color 0.15s ease',
    whiteSpace:     'nowrap' as const,
    justifyContent: collapsed ? 'center' : 'flex-start',
    overflow:       'hidden',
  }),

  tabAccentBar: (): React.CSSProperties => ({
    position:     'absolute',
    left:         0,
    top:          '4px',
    bottom:       '4px',
    width:        '3px',
    borderRadius: '0 3px 3px 0',
    background:   'linear-gradient(180deg, #c4485a, #d4956a)',
    boxShadow:    '0 0 8px rgba(196,72,90,0.6)',
  }),

  tabIcon: (): React.CSSProperties => ({
    fontSize:   '18px',
    flexShrink: 0,
    lineHeight: 1,
  }),

  bottomSection: (collapsed: boolean): React.CSSProperties => ({
    borderTop:      '1px solid rgba(196,72,90,0.08)',
    padding:        '8px 6px',
    display:        'flex',
    flexDirection:  'column',
    gap:            '2px',
    flexShrink:     0,
  }),

  iconBtn: (collapsed: boolean): React.CSSProperties => ({
    display:        'flex',
    alignItems:     'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap:            '10px',
    padding:        collapsed ? '10px 0' : '10px 14px',
    borderRadius:   '8px',
    background:     'transparent',
    border:         'none',
    color:          'rgba(184,169,158,0.7)',
    fontSize:       '11px',
    fontWeight:     700,
    letterSpacing:  '0.8px',
    textTransform:  'uppercase' as const,
    cursor:         'pointer',
    width:          '100%',
    transition:     'background 0.15s, color 0.15s',
    whiteSpace:     'nowrap' as const,
  }),

  collapseBtn: (collapsed: boolean): React.CSSProperties => ({
    display:        'flex',
    alignItems:     'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap:            '10px',
    padding:        collapsed ? '10px 0' : '10px 14px',
    borderRadius:   '8px',
    background:     'transparent',
    border:         'none',
    color:          'rgba(184,169,158,0.5)',
    fontSize:       '11px',
    fontWeight:     700,
    letterSpacing:  '0.8px',
    cursor:         'pointer',
    width:          '100%',
    transition:     'background 0.15s, color 0.15s',
    whiteSpace:     'nowrap' as const,
  }),

  badge: (): React.CSSProperties => ({
    position:       'absolute',
    top:            '6px',
    right:          '6px',
    minWidth:       '16px',
    height:         '16px',
    borderRadius:   '8px',
    background:     '#ef4444',
    color:          '#fff',
    fontSize:       '9px',
    fontWeight:     900,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '0 3px',
    lineHeight:     1,
  }),

  overlay: (): React.CSSProperties => ({
    position:   'fixed',
    inset:      0,
    background: 'rgba(0,0,0,0.6)',
    zIndex:     999,
    backdropFilter: 'blur(2px)',
  }),

  hamburger: (): React.CSSProperties => ({
    position:       'fixed',
    top:            '12px',
    left:           '12px',
    zIndex:         1001,
    width:          '36px',
    height:         '36px',
    borderRadius:   '8px',
    background:     'rgba(10, 7, 8, 0.9)',
    border:         '1px solid rgba(196,72,90,0.2)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '16px',
    cursor:         'pointer',
    color:          'rgba(184,169,158,0.8)',
    backdropFilter: 'blur(10px)',
  }),
}

export default function Nav() {
  const pathname     = usePathname()
  const unreadCount  = useStore((s) => s.unreadCount)

  const [collapsed,         setCollapsed]         = useState(false)
  const [settingsOpen,      setSettingsOpen]      = useState(false)
  const [notifOpen,         setNotifOpen]         = useState(false)
  const [mobileOpen,        setMobileOpen]        = useState(false)
  const [isMobile,          setIsMobile]          = useState(false)
  const [hoveredHref,       setHoveredHref]       = useState<string | null>(null)
  const [hoveredBtn,        setHoveredBtn]        = useState<string | null>(null)

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('nexus-sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('nexus-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const effectiveCollapsed = isMobile ? true : collapsed

  // Sync CSS variable for main content padding
  useEffect(() => {
    const w = isMobile ? 0 : (effectiveCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED)
    document.documentElement.style.setProperty('--sidebar-width', w + 'px')
  }, [effectiveCollapsed, isMobile])
  const sidebarVisible     = isMobile ? mobileOpen : true

  // Group tabs by group index
  const groups: { tabs: typeof TABS }[] = []
  let currentGroup = -1
  for (const tab of TABS) {
    if (tab.group !== currentGroup) {
      groups.push({ tabs: [tab] })
      currentGroup = tab.group
    } else {
      groups[groups.length - 1].tabs.push(tab)
    }
  }

  const SidebarContent = (
    <motion.nav
      initial={false}
      animate={{ width: effectiveCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={STYLES.sidebar(effectiveCollapsed)}
    >
      {/* Logo */}
      <div style={STYLES.logo(effectiveCollapsed)}>
        <div style={STYLES.logoMark()}>N</div>
        <AnimatePresence>
          {!effectiveCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={STYLES.logoText()}
            >
              NEXUS PRIME
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav links */}
      <div style={STYLES.navScroll()}>
        {groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={STYLES.divider()} />}
            {group.tabs.map((tab) => {
              const active  = pathname === tab.href || (pathname === '/' && tab.href === '/command')
              const hovered = hoveredHref === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    ...STYLES.tabLink(active, effectiveCollapsed),
                    background: active
                      ? 'rgba(196,72,90,0.18)'
                      : hovered
                        ? 'rgba(196,72,90,0.07)'
                        : 'transparent',
                    color: active
                      ? '#f5d0d6'
                      : hovered
                        ? 'rgba(232,160,170,0.9)'
                        : 'rgba(184,169,158,0.75)',
                  }}
                  onMouseEnter={() => setHoveredHref(tab.href)}
                  onMouseLeave={() => setHoveredHref(null)}
                  title={effectiveCollapsed ? tab.label : undefined}
                >
                  {active && <span style={STYLES.tabAccentBar()} />}
                  <span style={STYLES.tabIcon()}>{tab.icon}</span>
                  <AnimatePresence>
                    {!effectiveCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15 }}
                        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {tab.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div style={STYLES.bottomSection(effectiveCollapsed)}>
        {/* Notifications bell */}
        <button
          style={{
            ...STYLES.iconBtn(effectiveCollapsed),
            background: hoveredBtn === 'notif' ? 'rgba(196,72,90,0.07)' : 'transparent',
            color:      hoveredBtn === 'notif' ? 'rgba(232,160,170,0.9)' : 'rgba(184,169,158,0.7)',
            position:   'relative',
          }}
          onClick={() => setNotifOpen(true)}
          onMouseEnter={() => setHoveredBtn('notif')}
          onMouseLeave={() => setHoveredBtn(null)}
          title="Notifications"
        >
          <span style={STYLES.tabIcon()}>🔔</span>
          {unreadCount > 0 && (
            <span style={STYLES.badge()}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <AnimatePresence>
            {!effectiveCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
              >
                ALERTS
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Settings gear */}
        <button
          style={{
            ...STYLES.iconBtn(effectiveCollapsed),
            background: hoveredBtn === 'settings' ? 'rgba(196,72,90,0.07)' : 'transparent',
            color:      hoveredBtn === 'settings' ? 'rgba(232,160,170,0.9)' : 'rgba(184,169,158,0.7)',
          }}
          onClick={() => setSettingsOpen(true)}
          onMouseEnter={() => setHoveredBtn('settings')}
          onMouseLeave={() => setHoveredBtn(null)}
          title="Settings"
        >
          <span style={STYLES.tabIcon()}>⚙️</span>
          <AnimatePresence>
            {!effectiveCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
              >
                SETTINGS
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            style={{
              ...STYLES.collapseBtn(effectiveCollapsed),
              background: hoveredBtn === 'collapse' ? 'rgba(196,72,90,0.05)' : 'transparent',
              color:      hoveredBtn === 'collapse' ? 'rgba(184,169,158,0.7)' : 'rgba(122,107,98,0.6)',
            }}
            onClick={toggleCollapse}
            onMouseEnter={() => setHoveredBtn('collapse')}
            onMouseLeave={() => setHoveredBtn(null)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span style={{ fontSize: '14px', flexShrink: 0 }}>
              {effectiveCollapsed ? '▶' : '◀'}
            </span>
            <AnimatePresence>
              {!effectiveCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  style={{ fontSize: '10px', letterSpacing: '0.6px' }}
                >
                  COLLAPSE
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>
    </motion.nav>
  )

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          style={STYLES.hamburger()}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={STYLES.overlay()}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -SIDEBAR_EXPANDED }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_EXPANDED }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1000 }}
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      {!isMobile && SidebarContent}

      {/* Drawers */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
