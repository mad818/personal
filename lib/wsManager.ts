/**
 * lib/wsManager.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME WebSocket connection manager with:
 *  - Auto-reconnect using exponential backoff (1s → 2s → 4s → 8s → max 30s)
 *  - Connection state tracking (connecting | connected | disconnected | error)
 *  - Offline message queue — flushed when reconnected
 *  - Heartbeat/ping-pong every 30 seconds to detect stale connections
 *  - Automatic dispatch of incoming messages to the global eventBus
 *  - React hook: useWebSocket(url) → { status, send, lastMessage }
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { eventBus } from '@/lib/eventBus'

// ── Types ──────────────────────────────────────────────────────────────────────
export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WSMessage {
  type:    string
  payload: unknown
  ts:      number
}

export interface WSHookReturn {
  status:      WSStatus
  send:        (msg: WSMessage | string) => void
  lastMessage: WSMessage | null
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BACKOFF_BASE_MS   = 1_000
const BACKOFF_MAX_MS    = 30_000
const HEARTBEAT_MS      = 30_000
const PING_PAYLOAD      = JSON.stringify({ type: 'ping', ts: 0 })

// ── WebSocketManager class ─────────────────────────────────────────────────────
export class WebSocketManager {
  private ws:             WebSocket | null = null
  private url:            string
  private status:         WSStatus = 'disconnected'
  private retryCount:     number   = 0
  private retryTimer:     ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private messageQueue:   string[] = []
  private listeners:      Set<(status: WSStatus, msg?: WSMessage) => void> = new Set()
  private destroyed:      boolean  = false

  constructor(url: string) {
    this.url = url
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  connect(): void {
    if (this.destroyed) return
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this._setStatus('connecting')
    this._openSocket()
  }

  disconnect(): void {
    this.destroyed = true
    this._clearTimers()
    this.ws?.close(1000, 'Manual disconnect')
    this.ws = null
    this._setStatus('disconnected')
  }

  send(msg: WSMessage | string): void {
    const payload = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    } else {
      // Queue for when connection is restored
      this.messageQueue.push(payload)
    }
  }

  /** Subscribe to status/message updates. Returns unsubscribe fn. */
  subscribe(listener: (status: WSStatus, msg?: WSMessage) => void): () => void {
    this.listeners.add(listener)
    // Immediately notify of current status
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  getStatus(): WSStatus { return this.status }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _openSocket(): void {
    try {
      this.ws = new WebSocket(this.url)
    } catch {
      this._setStatus('error')
      this._scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.retryCount = 0
      this._setStatus('connected')
      this._startHeartbeat()
      this._flushQueue()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) as WSMessage : null
        if (!raw) return

        // Handle pong silently
        if (raw.type === 'pong') return

        const msg: WSMessage = { ...raw, ts: raw.ts ?? Date.now() }
        this._notify(msg)

        // Route to eventBus if the message type matches a known event
        this._routeToEventBus(msg)
      } catch {
        // Non-JSON message — dispatch as raw
        this._notify({ type: 'raw', payload: event.data, ts: Date.now() })
      }
    }

    this.ws.onerror = () => {
      this._setStatus('error')
      eventBus.emit('system:health', {
        component: `ws:${this.url}`,
        status:    'degraded',
        message:   'WebSocket error',
        ts:        Date.now(),
      })
    }

    this.ws.onclose = (event: CloseEvent) => {
      this._stopHeartbeat()
      if (!this.destroyed && event.code !== 1000) {
        this._setStatus('disconnected')
        this._scheduleReconnect()
      } else {
        this._setStatus('disconnected')
      }
    }
  }

  private _routeToEventBus(msg: WSMessage): void {
    const { type, payload } = msg
    try {
      switch (type) {
        case 'sensor:data':
          eventBus.emit('sensor:data', payload as Parameters<typeof eventBus.emit<'sensor:data'>>[1])
          break
        case 'camera:alert':
          eventBus.emit('camera:alert', payload as Parameters<typeof eventBus.emit<'camera:alert'>>[1])
          break
        case 'drone:telemetry':
          eventBus.emit('drone:telemetry', payload as Parameters<typeof eventBus.emit<'drone:telemetry'>>[1])
          break
        case 'vehicle:telemetry':
          eventBus.emit('vehicle:telemetry', payload as Parameters<typeof eventBus.emit<'vehicle:telemetry'>>[1])
          break
        case 'mqtt:message':
          eventBus.emit('mqtt:message', payload as Parameters<typeof eventBus.emit<'mqtt:message'>>[1])
          break
        case 'system:health':
          eventBus.emit('system:health', payload as Parameters<typeof eventBus.emit<'system:health'>>[1])
          break
      }
    } catch {
      // Route failure is non-fatal
    }
  }

  private _scheduleReconnect(): void {
    if (this.destroyed) return
    this._clearRetryTimer()
    const backoff = Math.min(BACKOFF_BASE_MS * 2 ** this.retryCount, BACKOFF_MAX_MS)
    this.retryCount++
    this.retryTimer = setTimeout(() => {
      if (!this.destroyed) this._openSocket()
    }, backoff)
  }

  private _flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const payload = this.messageQueue.shift()!
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(payload)
      }
    }
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(PING_PAYLOAD)
      }
    }, HEARTBEAT_MS)
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
  }

  private _clearRetryTimer(): void {
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null }
  }

  private _clearTimers(): void {
    this._clearRetryTimer()
    this._stopHeartbeat()
  }

  private _setStatus(status: WSStatus): void {
    this.status = status
    this.listeners.forEach((l) => l(status))
  }

  private _notify(msg: WSMessage): void {
    this.listeners.forEach((l) => l(this.status, msg))
  }
}

// ── Module-level manager registry ─────────────────────────────────────────────
const managers = new Map<string, WebSocketManager>()

export function getWSManager(url: string): WebSocketManager {
  if (!managers.has(url)) {
    managers.set(url, new WebSocketManager(url))
  }
  return managers.get(url)!
}

// ── React hook ─────────────────────────────────────────────────────────────────
/**
 * useWebSocket — Connect to a WebSocket URL and get reactive status + messages.
 *
 * @example
 * const { status, send, lastMessage } = useWebSocket('ws://localhost:8765')
 */
export function useWebSocket(url: string): WSHookReturn {
  const [status, setStatus]           = useState<WSStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const managerRef                    = useRef<WebSocketManager | null>(null)

  useEffect(() => {
    const manager = getWSManager(url)
    managerRef.current = manager

    const unsub = manager.subscribe((s, msg) => {
      setStatus(s)
      if (msg) setLastMessage(msg)
    })

    manager.connect()

    return () => {
      unsub()
      // Don't disconnect — other components may share this manager
    }
  }, [url])

  const send = useCallback((msg: WSMessage | string) => {
    managerRef.current?.send(msg)
  }, [])

  return { status, send, lastMessage }
}

export default WebSocketManager
