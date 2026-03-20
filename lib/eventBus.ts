/**
 * lib/eventBus.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME typed pub/sub event bus for system-wide component communication.
 * Provides strongly-typed events, subscribe/unsubscribe/emit primitives, and a
 * React hook for declarative event consumption.
 *
 * Usage:
 *   eventBus.emit('sensor:data', { deviceId: 'a', type: 'temp', value: 23, unit: '°C', ts: Date.now() })
 *   eventBus.subscribe('sensor:data', handler)
 *   // In React:
 *   useEventBus('camera:alert', (data) => console.log(data))
 */

import { useEffect, useRef } from 'react'

// ── Typed event map ────────────────────────────────────────────────────────────
export type EventMap = {
  'sensor:data': {
    deviceId: string
    type:     string
    value:    number
    unit:     string
    ts:       number
  }
  'camera:alert': {
    cameraId:   string
    type:       string
    confidence: number
    snapshot?:  string
    ts:         number
  }
  'drone:telemetry': {
    droneId:  string
    lat:      number
    lng:      number
    alt:      number
    battery:  number
    mode:     string
    ts:       number
  }
  'vehicle:telemetry': {
    vehicleId: string
    speed:     number
    lat:       number
    lng:       number
    heading:   number
    mode:      string
    cameras:   Record<string, string>
    ts:        number
  }
  'skill:learned': {
    skillId:  string
    name:     string
    category: string
    ts:       number
  }
  'system:health': {
    component: string
    status:    'healthy' | 'degraded' | 'down'
    message:   string
    ts:        number
  }
  'mqtt:message': {
    topic:   string
    payload: unknown
    ts:      number
  }
  'system:error': {
    source: string
    error:  string
    stack?: string
    ts:     number
  }
  'automation:trigger': {
    ruleId:    string
    condition: string
    action:    string
    ts:        number
  }
}

export type EventName = keyof EventMap
export type EventHandler<K extends EventName> = (data: EventMap[K]) => void

// ── Internal listener registry ─────────────────────────────────────────────────
type ListenerMap = {
  [K in EventName]?: Set<EventHandler<K>>
}

// ── EventBus class ─────────────────────────────────────────────────────────────
class EventBus {
  private listeners: ListenerMap = {}

  subscribe<K extends EventName>(event: K, handler: EventHandler<K>): () => void {
    if (!this.listeners[event]) {
      // Using type assertion to handle the heterogeneous Set union
      (this.listeners as Record<string, Set<EventHandler<EventName>>>)[event] = new Set()
    }
    ;(this.listeners[event] as Set<EventHandler<K>>).add(handler)

    // Return unsubscribe function
    return () => this.unsubscribe(event, handler)
  }

  unsubscribe<K extends EventName>(event: K, handler: EventHandler<K>): void {
    ;(this.listeners[event] as Set<EventHandler<K>> | undefined)?.delete(handler)
  }

  emit<K extends EventName>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners[event] as Set<EventHandler<K>> | undefined
    if (!handlers) return
    handlers.forEach((handler) => {
      try {
        handler(data)
      } catch (err) {
        // Self-report errors without infinite loops
        if (event !== 'system:error') {
          this.emit('system:error', {
            source: `eventBus:${event}`,
            error:  err instanceof Error ? err.message : String(err),
            stack:  err instanceof Error ? err.stack : undefined,
            ts:     Date.now(),
          })
        }
      }
    })
  }

  /** Remove all listeners for an event (or all events if none specified) */
  clear(event?: EventName): void {
    if (event) {
      delete this.listeners[event]
    } else {
      this.listeners = {}
    }
  }

  /** Return count of listeners for debugging */
  listenerCount(event: EventName): number {
    return this.listeners[event]?.size ?? 0
  }
}

// ── Singleton instance ─────────────────────────────────────────────────────────
export const eventBus = new EventBus()

// ── React hook ────────────────────────────────────────────────────────────────
/**
 * useEventBus — Subscribe to an event bus event inside a React component.
 * Automatically unsubscribes on unmount. Callback is stable-ref'd to avoid
 * re-subscriptions on every render.
 *
 * @example
 * useEventBus('sensor:data', (data) => setTemp(data.value))
 */
export function useEventBus<K extends EventName>(
  event: K,
  callback: EventHandler<K>
): void {
  // Keep a stable ref to the latest callback to avoid stale closure issues
  const callbackRef = useRef<EventHandler<K>>(callback)
  callbackRef.current = callback

  useEffect(() => {
    const handler: EventHandler<K> = (data) => callbackRef.current(data)
    const unsub = eventBus.subscribe(event, handler)
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])
}

export default eventBus
