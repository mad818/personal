// ── components/system/ErrorBoundary ────────────────────────
// React error boundary for graceful error handling across components.

"use client";

/**
 * components/system/ErrorBoundary.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME error boundary component.
 * Catches React render errors, logs them to the eventBus 'system:error' channel,
 * and displays the shared Homefront route-recovery plane.
 * Includes a "Retry" button to unmount/remount children and attempt recovery.
 *
 * Usage:
 *   <ErrorBoundary label="SensorGrid">
 *     <SensorGrid />
 *   </ErrorBoundary>
 */

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import RouteStatePanel from "@/components/ui/RouteStatePanel";
import { eventBus } from "@/lib/eventBus";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

// ── Props & State ──────────────────────────────────────────────────────────────
interface Props {
  children: ReactNode;
  label?: string; // Descriptive name for error reporting
  fallback?: ReactNode; // Custom fallback (overrides default)
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorKey: number; // Increment to remount children
}

// ── ErrorBoundary class ────────────────────────────────────────────────────────
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { label = "unknown", onError } = this.props;

    // Emit to global event bus for diagnostics
    eventBus.emit("system:error", {
      source: `ErrorBoundary:${label}`,
      error: error.message,
      stack: `${error.stack}\n\nComponent Stack:\n${info.componentStack}`,
      ts: Date.now(),
    });

    // Call optional custom handler
    onError?.(error, info);

    // Also log to console in dev
    if (process.env.NODE_ENV !== "production") {
      console.error(`[ErrorBoundary:${label}]`, error, info);
    }
  }

  handleRetry = (): void => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      errorKey: s.errorKey + 1,
    }));
  };

  render(): ReactNode {
    const { hasError, error, errorKey } = this.state;
    const { children, label = "Component", fallback } = this.props;

    if (!hasError) {
      return <React.Fragment key={errorKey}>{children}</React.Fragment>;
    }

    if (fallback) return fallback;

    return (
      <ErrorFallback label={label} error={error} onRetry={this.handleRetry} />
    );
  }
}

// ── Fallback UI ────────────────────────────────────────────────────────────────
function ErrorFallback({
  label,
  error,
  onRetry,
}: {
  label: string;
  error: Error | null;
  onRetry: () => void;
}): React.ReactElement {
  const debugDetail =
    process.env.NODE_ENV !== "production" && error
      ? [error.message, error.stack].filter(Boolean).join("\n\n")
      : undefined;

  return (
    <RouteStatePanel
      kind="error"
      eyebrow={`Recovery / ${label}`}
      title="Workspace interrupted"
      description={`The ${label} surface stopped rendering. Retry it locally, reload the current route, or return to HQ.`}
      announcement={`The ${label} Nexus surface encountered a render error`}
      testId="root-error-boundary-state"
      debugDetail={debugDetail}
      actions={
        <>
          <button
            type="button"
            className="nexus-route-state__action nexus-route-state__action--primary"
            onClick={onRetry}
          >
            Retry surface
          </button>
          <button
            type="button"
            className="nexus-route-state__action"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <button
            type="button"
            className="nexus-route-state__action"
            onClick={() => window.location.assign(getDefaultEntrypoint())}
          >
            Open HQ
          </button>
        </>
      }
    />
  );
}

export default ErrorBoundary;
