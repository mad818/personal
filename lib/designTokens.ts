/**
 * Semantic design tokens — maps operator tones to DESIGN.md runtime CSS variables.
 * Use these instead of drift hex in assimilation and status UI.
 */

export const designTokens = {
  success: "var(--nexus-ux7-good)",
  warning: "var(--nexus-ux7-warn)",
  critical: "var(--nexus-ux7-alert)",
  info: "var(--nexus-ux7-blue)",
  live: "var(--nexus-ux7-cyan)",
  ready: "var(--nexus-ux7-blue)",
  neutral: "var(--text3)",
  textOnAccent: "var(--primary)",
  textStrong: "var(--text-strong)",
  trajectory: "var(--nexus-ux7-blue)",
} as const;

export type DesignSeverity =
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "live"
  | "neutral";

export function designSeverityColor(severity: DesignSeverity): string {
  return designTokens[severity];
}

export function assimilationDecisionColor(decision: string): string {
  switch (decision) {
    case "adopt":
      return designTokens.success;
    case "reject":
      return designTokens.critical;
    default:
      return designTokens.warning;
  }
}

export function networkHealthStatusColor(status: string): string {
  switch (status) {
    case "ok":
      return designTokens.success;
    case "warn":
      return designTokens.warning;
    case "fail":
      return designTokens.critical;
    case "checking":
      return designTokens.ready;
    default:
      return designTokens.neutral;
  }
}

export function opsDensitySeverityColor(
  severity: "hot" | "elevated" | "watch",
): string {
  switch (severity) {
    case "hot":
      return designTokens.critical;
    case "elevated":
      return designTokens.warning;
    default:
      return designTokens.info;
  }
}

export function mementoPhaseColor(phase: "read" | "reflect" | "write"): string {
  switch (phase) {
    case "read":
      return designTokens.info;
    case "reflect":
      return designTokens.warning;
    case "write":
      return designTokens.success;
  }
}

export function overnightMissionStatusColor(status: string): string {
  switch (status) {
    case "pending_review":
      return designTokens.warning;
    case "expired":
      return designTokens.critical;
    case "cleared":
      return designTokens.success;
    case "ready":
      return designTokens.ready;
    default:
      return designTokens.neutral;
  }
}

export function teamOrchestrationPhaseColor(phase: number): string {
  if (phase <= 1) return designTokens.info;
  if (phase >= 4) return designTokens.success;
  return designTokens.warning;
}
