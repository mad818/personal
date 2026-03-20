'use client'

// AutomationRules.tsx — If-this-then-that automation rules with enable toggles,
// Add Rule form, and 5 demo rules including drone patrol.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AutoRule {
  id:      string
  name:    string
  trigger: string
  action:  string
  enabled: boolean
  icon:    string
  color:   string
}

const DEMO_RULES: AutoRule[] = [
  { id: 'r1', name: 'Night Watch',       trigger: 'Motion detected after 10PM',                              action: 'Turn on floodlights + Record all cameras',    enabled: true,  icon: '🌙', color: '#818cf8' },
  { id: 'r2', name: 'Thermal Alert',     trigger: 'Temperature sensor > 40°C',                              action: 'Send push notification + Activate cooling',   enabled: true,  icon: '🔥', color: '#f59e0b' },
  { id: 'r3', name: 'Perimeter Breach',  trigger: 'Door sensor triggered + No authorized BLE device nearby',action: 'Sound alarm + Record all cameras',            enabled: true,  icon: '🚨', color: '#ef4444' },
  { id: 'r4', name: 'Air Quality',       trigger: 'CO2 level > 1000 ppm',                                   action: 'Activate ventilation system',                 enabled: false, icon: '🌬️', color: '#10b981' },
  { id: 'r5', name: 'Drone Patrol',      trigger: 'Perimeter breach at night (after 10PM)',                  action: 'Launch UAV-1 patrol + Notify security team',  enabled: true,  icon: '🚁', color: 'var(--accent)' },
]

const TRIGGER_OPTIONS = [
  'Motion detected after 10PM',
  'Temperature > threshold',
  'Door/window opened',
  'CO2 > 1000ppm',
  'Perimeter breach detected',
  'Camera alert triggered',
  'Device goes offline',
]

const ACTION_OPTIONS = [
  'Send push notification',
  'Activate floodlights',
  'Record all cameras',
  'Sound alarm',
  'Launch patrol drone',
  'Activate cooling system',
  'Activate ventilation',
  'Lock all doors',
]

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '32px', height: '18px', borderRadius: '9px', cursor: 'pointer', flexShrink: 0,
        background: enabled ? 'var(--accent)' : 'var(--surf3)',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <motion.div
        animate={{ left: enabled ? '16px' : '2px' }}
        transition={{ duration: 0.2 }}
        style={{ position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff' }}
      />
    </div>
  )
}

export default function AutomationRules() {
  const [rules, setRules]       = useState<AutoRule[]>(DEMO_RULES)
  const [showAdd, setShowAdd]   = useState(false)
  const [newRule, setNewRule]   = useState({ name: '', trigger: TRIGGER_OPTIONS[0], action: ACTION_OPTIONS[0] })

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const addRule = () => {
    if (!newRule.name.trim()) return
    setRules((prev) => [...prev, {
      id:      `r${Date.now()}`,
      name:    newRule.name,
      trigger: newRule.trigger,
      action:  newRule.action,
      enabled: true,
      icon:    '⚡',
      color:   'var(--accent2)',
    }])
    setShowAdd(false)
    setNewRule({ name: '', trigger: TRIGGER_OPTIONS[0], action: ACTION_OPTIONS[0] })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Automation Rules — {rules.filter((r) => r.enabled).length}/{rules.length} Active
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--rs)',
            border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
        >
          + Add Rule
        </button>
      </div>

      {/* Add Rule inline form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '10px' }}
          >
            <div style={{ background: 'var(--surf2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Rule</div>
              <input
                value={newRule.name}
                onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                placeholder="Rule name…"
                style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '6px 10px', fontSize: '11px', color: 'var(--text)', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginBottom: '3px', textTransform: 'uppercase' }}>IF trigger</div>
                  <select
                    value={newRule.trigger}
                    onChange={(e) => setNewRule((p) => ({ ...p, trigger: e.target.value }))}
                    style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '6px 8px', fontSize: '10px', color: 'var(--text)', outline: 'none' }}
                  >
                    {TRIGGER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text3)', marginBottom: '3px', textTransform: 'uppercase' }}>THEN action</div>
                  <select
                    value={newRule.action}
                    onChange={(e) => setNewRule((p) => ({ ...p, action: e.target.value }))}
                    style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '6px 8px', fontSize: '10px', color: 'var(--text)', outline: 'none' }}
                  >
                    {ACTION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '6px', borderRadius: 'var(--rs)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Cancel</button>
                <button onClick={addRule} style={{ flex: 2, padding: '6px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>Save Rule</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rules.map((rule) => (
          <div key={rule.id} style={{
            background:    'var(--surf2)',
            border:        `1px solid ${rule.enabled ? rule.color + '55' : 'var(--border)'}`,
            borderRadius:  'var(--rs)',
            padding:       '10px 12px',
            opacity:       rule.enabled ? 1 : 0.5,
            transition:    'opacity 0.2s, border-color 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {/* Icon */}
              <span style={{ fontSize: '16px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>{rule.icon}</span>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{rule.name}</div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(129,140,248,0.15)', color: '#818cf8', whiteSpace: 'nowrap' }}>
                    IF
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text2)', lineHeight: '16px' }}>{rule.trigger}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '3px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(196,72,90,0.15)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    THEN
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text2)', lineHeight: '16px' }}>{rule.action}</span>
                </div>
              </div>

              {/* Toggle */}
              <ToggleSwitch enabled={rule.enabled} onChange={() => toggleRule(rule.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
