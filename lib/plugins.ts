/**
 * lib/plugins.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME extensible plugin architecture.
 * Provides the NexusPlugin interface, PluginManager class, and Zustand slice
 * integration for storing/retrieving plugin state across sessions.
 *
 * Usage:
 *   import { pluginManager } from '@/lib/plugins'
 *   pluginManager.register(myPlugin)
 *   pluginManager.enablePlugin('my-plugin-id')
 *   const plugins = pluginManager.getPlugins()
 */

import { eventBus } from '@/lib/eventBus'

// ── Plugin interface ───────────────────────────────────────────────────────────
export interface NexusPlugin {
  id:          string
  name:        string
  version:     string
  category:    'security' | 'iot' | 'vehicle' | 'intelligence' | 'automation'
  description: string
  enabled:     boolean

  // ── Lifecycle hooks ──────────────────────────────────────────────────────────
  onInit?:    () => Promise<void>
  onDestroy?: () => Promise<void>

  // ── Data hooks ───────────────────────────────────────────────────────────────
  onData?: (event: string, data: unknown) => void

  // ── UI contributions ─────────────────────────────────────────────────────────
  widgets?: Array<{
    id:        string
    title:     string
    component: string
    position:  'main' | 'sidebar' | 'header'
  }>

  // ── Configuration schema ─────────────────────────────────────────────────────
  configSchema?: Record<string, {
    type:     string
    label:    string
    default?: unknown
  }>
}

// ── Plugin state change listener type ─────────────────────────────────────────
type PluginListener = (plugins: NexusPlugin[]) => void

// ── PluginManager class ────────────────────────────────────────────────────────
export class PluginManager {
  private plugins:       Map<string, NexusPlugin>          = new Map()
  private listeners:     Set<PluginListener>                = new Set()
  private _pluginConfigs: Map<string, Record<string, unknown>> = new Map()

  // ── Registration ─────────────────────────────────────────────────────────────

  /** Register a plugin. Will run onInit() if enabled. */
  async register(plugin: NexusPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin "${plugin.id}" is already registered. Use update instead.`)
      return
    }

    this.plugins.set(plugin.id, { ...plugin })

    if (plugin.enabled && plugin.onInit) {
      try {
        await plugin.onInit()
        eventBus.emit('system:health', {
          component: `plugin:${plugin.id}`,
          status:    'healthy',
          message:   `Plugin "${plugin.name}" initialized`,
          ts:        Date.now(),
        })
      } catch (err) {
        eventBus.emit('system:error', {
          source: `plugin:${plugin.id}:onInit`,
          error:  err instanceof Error ? err.message : String(err),
          stack:  err instanceof Error ? err.stack : undefined,
          ts:     Date.now(),
        })
      }
    }

    this._notify()
  }

  /** Unregister a plugin. Will run onDestroy() first. */
  async unregister(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (!plugin) return

    if (plugin.onDestroy) {
      try {
        await plugin.onDestroy()
      } catch (err) {
        eventBus.emit('system:error', {
          source: `plugin:${id}:onDestroy`,
          error:  err instanceof Error ? err.message : String(err),
          ts:     Date.now(),
        })
      }
    }

    this.plugins.delete(id)
    this._notify()
  }

  // ── Retrieval ────────────────────────────────────────────────────────────────

  getPlugins(category?: NexusPlugin['category']): NexusPlugin[] {
    const all: NexusPlugin[] = []
    this.plugins.forEach((p) => all.push(p))
    return category ? all.filter((p) => p.category === category) : all
  }

  getPlugin(id: string): NexusPlugin | undefined {
    return this.plugins.get(id)
  }

  getEnabledPlugins(): NexusPlugin[] {
    return this.getPlugins().filter((p) => p.enabled)
  }

  // ── Enable / disable ─────────────────────────────────────────────────────────

  async enablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (!plugin || plugin.enabled) return

    plugin.enabled = true
    if (plugin.onInit) {
      try {
        await plugin.onInit()
      } catch (err) {
        plugin.enabled = false
        eventBus.emit('system:error', {
          source: `plugin:${id}:enable`,
          error:  err instanceof Error ? err.message : String(err),
          ts:     Date.now(),
        })
        this._notify()
        return
      }
    }

    eventBus.emit('system:health', {
      component: `plugin:${id}`,
      status:    'healthy',
      message:   `Plugin "${plugin.name}" enabled`,
      ts:        Date.now(),
    })

    this._notify()
  }

  async disablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (!plugin || !plugin.enabled) return

    if (plugin.onDestroy) {
      try {
        await plugin.onDestroy()
      } catch (err) {
        eventBus.emit('system:error', {
          source: `plugin:${id}:disable`,
          error:  err instanceof Error ? err.message : String(err),
          ts:     Date.now(),
        })
      }
    }

    plugin.enabled = false
    this._notify()
  }

  /** Update plugin config values */
  updatePluginConfig(id: string, config: Record<string, unknown>): void {
    const plugin = this.plugins.get(id)
    if (!plugin) return
    // Merge config into a separate config store keyed by plugin id
    const existing = (this._pluginConfigs.get(id) ?? {})
    this._pluginConfigs.set(id, { ...existing, ...config })
    this._notify()
  }

  /** Retrieve stored config for a plugin */
  getPluginConfig(id: string): Record<string, unknown> {
    return this._pluginConfigs.get(id) ?? {}
  }

  // ── Data routing ─────────────────────────────────────────────────────────────

  /** Dispatch an event to all enabled plugins that have onData handlers */
  dispatchToPlugins(event: string, data: unknown): void {
    this.plugins.forEach((plugin) => {
      if (!plugin.enabled || !plugin.onData) return
      try {
        plugin.onData(event, data)
      } catch (err) {
        eventBus.emit('system:error', {
          source: `plugin:${plugin.id}:onData`,
          error:  err instanceof Error ? err.message : String(err),
          ts:     Date.now(),
        })
      }
    })
  }

  // ── Persistence helpers ───────────────────────────────────────────────────────

  /** Export serializable plugin state for Zustand persistence */
  exportState(): NexusPlugin[] {
    return this.getPlugins().map((p) => {
      const { onInit: _i, onDestroy: _d, onData: _o, ...rest } = p
      void _i; void _d; void _o
      return rest as NexusPlugin
    })
  }

  /** Restore enabled/disabled state from persisted data (after registration) */
  restoreState(persisted: NexusPlugin[]): void {
    persisted.forEach((p) => {
      const existing = this.plugins.get(p.id)
      if (existing) existing.enabled = p.enabled
    })
    this._notify()
  }

  // ── Subscription ─────────────────────────────────────────────────────────────

  subscribe(listener: PluginListener): () => void {
    this.listeners.add(listener)
    listener(this.getPlugins())
    return () => this.listeners.delete(listener)
  }

  private _notify(): void {
    const plugins = this.getPlugins()
    this.listeners.forEach((l) => l(plugins))
  }
}

// ── Singleton instance ─────────────────────────────────────────────────────────
export const pluginManager = new PluginManager()

// ── Wire pluginManager to eventBus for cross-system data dispatch ──────────────
if (typeof window !== 'undefined') {
  // Route all events to plugin onData handlers
  const events = [
    'sensor:data', 'camera:alert', 'drone:telemetry', 'vehicle:telemetry',
    'skill:learned', 'system:health', 'mqtt:message', 'system:error',
    'automation:trigger',
  ] as const

  events.forEach((event) => {
    eventBus.subscribe(event, (data) => {
      pluginManager.dispatchToPlugins(event, data)
    })
  })
}

export default pluginManager
