// ── NEXUS PRIME Notification System ──────────────────────────────────────────
// Re-exports types from the main store and provides helper utilities.
// The actual store state lives in store/useStore.ts for a single source of truth.

export type { NotificationType, NotificationSeverity, Notification } from '@/store/useStore'

/**
 * Helper to create a notification payload (without id/timestamp/read).
 * Pass the result to store.addNotification().
 */
export function createNotification(
  type:     import('@/store/useStore').NotificationType,
  title:    string,
  message:  string,
  severity: import('@/store/useStore').NotificationSeverity,
  source:   string,
): Omit<import('@/store/useStore').Notification, 'id' | 'timestamp' | 'read'> {
  return { type, title, message, severity, source }
}

/** Severity → color mapping for UI components */
export const SEVERITY_COLORS: Record<import('@/store/useStore').NotificationSeverity, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#d4956a',
  low:      '#2dd4bf',
}

/** Type → emoji icon mapping */
export const TYPE_ICONS: Record<import('@/store/useStore').NotificationType, string> = {
  threat:  '⚠️',
  market:  '📈',
  seismic: '🌍',
  weather: '🌦️',
  system:  '⚙️',
  intel:   '🔍',
}
