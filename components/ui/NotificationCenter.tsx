'use client'

import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import type { Notification, NotificationSeverity, NotificationType } from '@/store/useStore'
import { SEVERITY_COLORS, TYPE_ICONS } from '@/lib/notifications'

// ── Filter types ───────────────────────────────────────────────────────────────
type Filter = 'all' | 'critical' | 'threats' | 'market' | 'system'

interface Props {
  open:    boolean
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(ts: number): string {
  const now   = Date.now()
  const diff  = now - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString()
}

function getGroup(ts: number): 'just-now' | 'today' | 'yesterday' | 'older' {
  const now  = Date.now()
  const diff = now - ts
  if (diff < 5 * 60_000)   return 'just-now'
  if (diff < 24 * 3_600_000) return 'today'
  if (diff < 48 * 3_600_000) return 'yesterday'
  return 'older'
}

const GROUP_LABELS: Record<string, string> = {
  'just-now':  'Just Now',
  'today':     'Earlier Today',
  'yesterday': 'Yesterday',
  'older':     'Older',
}

function filterNotifications(notifs: Notification[], f: Filter): Notification[] {
  if (f === 'all')      return notifs
  if (f === 'critical') return notifs.filter((n) => n.severity === 'critical')
  if (f === 'threats')  return notifs.filter((n) => n.type === 'threat')
  if (f === 'market')   return notifs.filter((n) => n.type === 'market')
  if (f === 'system')   return notifs.filter((n) => n.type === 'system')
  return notifs
}

// ── Notification card ──────────────────────────────────────────────────────────
function NotifCard({
  notif,
  onMark,
  onDismiss,
  index,
}: {
  notif:     Notification
  onMark:    (id: string) => void
  onDismiss: (id: string) => void
  index:     number
}) {
  const [hovered, setHovered] = useState(false)
  const borderColor = SEVERITY_COLORS[notif.severity]
  const icon        = TYPE_ICONS[notif.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      style={{
        position:     'relative',
        display:      'flex',
        gap:          '10px',
        padding:      '10px 12px',
        borderRadius: '8px',
        background:   hovered
          ? 'rgba(36,28,25,0.7)'
          : notif.read
            ? 'rgba(20,16,14,0.5)'
            : 'rgba(28,20,18,0.75)',
        border:       `1px solid ${hovered ? 'rgba(196,72,90,0.12)' : 'rgba(58,46,43,0.6)'}`,
        cursor:       'pointer',
        transition:   'background 0.15s, border 0.15s',
        borderLeft:   `3px solid ${borderColor}`,
        marginBottom: '4px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onMark(notif.id)}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div style={{
          position:     'absolute',
          top:          '10px',
          right:        '36px',
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          background:   '#c4485a',
          boxShadow:    '0 0 6px rgba(196,72,90,0.8)',
        }} />
      )}

      {/* Icon */}
      <div style={{
        fontSize:   '18px',
        lineHeight: 1,
        flexShrink: 0,
        marginTop:  '1px',
      }}>
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:     '11px',
          fontWeight:   700,
          color:        notif.read ? 'rgba(184,169,158,0.65)' : 'rgba(236,229,223,0.9)',
          marginBottom: '2px',
          textTransform:'uppercase' as const,
          letterSpacing:'0.4px',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {notif.title}
        </div>
        <div style={{
          fontSize:   '10.5px',
          color:      'rgba(122,107,98,0.9)',
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom:'3px',
        }}>
          {notif.message}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{
            fontSize:   '9px',
            color:      'rgba(122,107,98,0.6)',
            letterSpacing: '0.3px',
          }}>
            {notif.source} · {formatTime(notif.timestamp)}
          </span>
          <span style={{
            fontSize:     '8px',
            fontWeight:   700,
            color:        borderColor,
            textTransform:'uppercase' as const,
            letterSpacing:'0.5px',
            background:   `${borderColor}15`,
            padding:      '1px 4px',
            borderRadius: '3px',
          }}>
            {notif.severity}
          </span>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notif.id) }}
        style={{
          background:   'transparent',
          border:       'none',
          color:        hovered ? 'rgba(196,72,90,0.8)' : 'rgba(122,107,98,0.4)',
          cursor:       'pointer',
          fontSize:     '14px',
          lineHeight:   1,
          padding:      '0 2px',
          flexShrink:   0,
          transition:   'color 0.15s',
          alignSelf:    'flex-start',
          marginTop:    '1px',
        }}
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </motion.div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function NotificationCenter({ open, onClose }: Props) {
  const notifications     = useStore((s) => s.notifications)
  const markRead          = useStore((s) => s.markRead)
  const markAllRead       = useStore((s) => s.markAllRead)
  const dismissNotification = useStore((s) => s.dismissNotification)
  const unreadCount       = useStore((s) => s.unreadCount)

  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter]
  )

  // Group by time bucket
  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {}
    for (const n of filtered) {
      const g = getGroup(n.timestamp)
      if (!groups[g]) groups[g] = []
      groups[g].push(n)
    }
    return groups
  }, [filtered])

  const groupOrder = ['just-now', 'today', 'yesterday', 'older'] as const

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'threats',  label: 'Threats' },
    { key: 'market',   label: 'Market' },
    { key: 'system',   label: 'System' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position:   'fixed',
              inset:      0,
              background: 'rgba(0,0,0,0.4)',
              zIndex:     1100,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position:       'fixed',
              top:            0,
              right:          0,
              bottom:         0,
              width:          '320px',
              background:     'rgba(11, 8, 9, 0.96)',
              backdropFilter: 'blur(20px)',
              borderLeft:     '1px solid rgba(196,72,90,0.12)',
              boxShadow:      '-4px 0 40px rgba(0,0,0,0.7)',
              zIndex:         1101,
              display:        'flex',
              flexDirection:  'column',
              overflow:       'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding:      '16px 16px 12px',
              borderBottom: '1px solid rgba(196,72,90,0.08)',
              flexShrink:   0,
            }}>
              <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🔔</span>
                  <span style={{
                    fontSize:      '12px',
                    fontWeight:    900,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase' as const,
                    color:         'rgba(236,229,223,0.9)',
                  }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span style={{
                      background:   '#ef4444',
                      color:        '#fff',
                      borderRadius: '8px',
                      fontSize:     '9px',
                      fontWeight:   900,
                      padding:      '1px 5px',
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        background:   'transparent',
                        border:       '1px solid rgba(196,72,90,0.2)',
                        borderRadius: '5px',
                        color:        'rgba(196,72,90,0.8)',
                        fontSize:     '9px',
                        fontWeight:   700,
                        padding:      '3px 7px',
                        cursor:       'pointer',
                        letterSpacing:'0.4px',
                        textTransform:'uppercase' as const,
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    style={{
                      background: 'transparent',
                      border:     'none',
                      color:      'rgba(122,107,98,0.7)',
                      fontSize:   '20px',
                      cursor:     'pointer',
                      lineHeight: 1,
                      padding:    '0 2px',
                    }}
                    aria-label="Close notifications"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Filter chips */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      padding:      '3px 9px',
                      borderRadius: '12px',
                      fontSize:     '9px',
                      fontWeight:   700,
                      letterSpacing:'0.5px',
                      textTransform:'uppercase' as const,
                      border:       `1px solid ${filter === f.key ? 'rgba(196,72,90,0.5)' : 'rgba(58,46,43,0.6)'}`,
                      background:   filter === f.key ? 'rgba(196,72,90,0.18)' : 'transparent',
                      color:        filter === f.key ? '#f5d0d6' : 'rgba(122,107,98,0.8)',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications list */}
            <div style={{
              flex:       1,
              overflowY:  'auto' as const,
              padding:    '10px 10px',
              scrollbarWidth: 'thin' as const,
            }}>
              {filtered.length === 0 ? (
                <div style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  height:         '60%',
                  gap:            '10px',
                  color:          'rgba(122,107,98,0.5)',
                  fontSize:       '12px',
                  textAlign:      'center',
                }}>
                  <span style={{ fontSize: '28px', opacity: 0.4 }}>🔕</span>
                  No notifications
                </div>
              ) : (
                <>
                  {groupOrder.map((gKey) => {
                    const items = grouped[gKey]
                    if (!items || items.length === 0) return null
                    return (
                      <div key={gKey}>
                        <div style={{
                          fontSize:      '9px',
                          fontWeight:    700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase' as const,
                          color:         'rgba(122,107,98,0.5)',
                          padding:       '6px 4px 4px',
                          marginBottom:  '4px',
                        }}>
                          {GROUP_LABELS[gKey]}
                        </div>
                        <AnimatePresence>
                          {items.map((n, i) => (
                            <NotifCard
                              key={n.id}
                              notif={n}
                              index={i}
                              onMark={markRead}
                              onDismiss={dismissNotification}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
