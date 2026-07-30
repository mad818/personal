"use client";

import {
  type CSSProperties,
  type ReactNode,
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { NotificationSeverity } from "@/store/useStore";

// ── Toast types ────────────────────────────────────────────────────────────────
export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  severity: NotificationSeverity;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, "id">) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastContainer");
  return ctx;
}

// ── Standalone toast function (module-level) ───────────────────────────────────
// Allows calling toast() without hooks from anywhere. Emits a custom event.
export function toast(opts: Omit<ToastItem, "id">): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nexus:toast", { detail: opts }));
}

// ── Single toast card ──────────────────────────────────────────────────────────
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(
    () =>
      typeof document !== "undefined" && document.visibilityState === "hidden",
  );
  const duration = Math.max(1000, item.duration ?? 5000);
  const [remainingMs, setRemainingMs] = useState(() => duration);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const paused = hovered || focusWithin || documentHidden;
  const urgent = item.severity === "critical" || item.severity === "high";

  useEffect(() => {
    const handleVisibilityChange = () => {
      setDocumentHidden(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    if (paused) return;

    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTick;
      lastTick = now;
      setRemainingMs((current) => Math.max(0, current - elapsed));
    }, 50);
    return () => window.clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (remainingMs > 0) return;
    onDismiss(item.id);
  }, [item.id, onDismiss, remainingMs]);

  const remainingPercent = Math.max(
    0,
    Math.min(100, (remainingMs / duration) * 100),
  );

  return (
    <motion.div
      layout
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      aria-atomic="true"
      data-severity={item.severity}
      data-paused={paused}
      className="nexus-toast"
      initial={{ x: prefersReducedMotion ? 0 : 48, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { x: 48, opacity: 0, height: 0, marginBottom: 0 }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0.01 }
          : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
      style={
        {
          "--nexus-toast-progress": `${remainingPercent}%`,
        } as CSSProperties
      }
    >
      <div className="nexus-toast__header">
        <div className="nexus-toast__title">{item.title}</div>

        <div className="nexus-toast__actions">
          <span className="nexus-toast__severity">{item.severity}</span>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className="nexus-toast__dismiss"
            aria-label={`Dismiss ${item.title}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {item.message && (
        <div className="nexus-toast__message">{item.message}</div>
      )}

      <div className="nexus-toast__progress" aria-hidden="true">
        <div className="nexus-toast__progress-fill" />
      </div>
    </motion.div>
  );
}

// ── Toast container — add to layout ───────────────────────────────────────────
export default function ToastContainer({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => {
      const next = [{ ...opts, id }, ...prev].slice(0, 3); // max 3
      return next;
    });
  }, []);

  // Listen for module-level toast() calls
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Omit<ToastItem, "id">;
      addToast(detail);
    };
    window.addEventListener("nexus:toast", handler);
    return () => window.removeEventListener("nexus:toast", handler);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        role="region"
        aria-label="Transient notifications"
        className="nexus-toast-region"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastCard key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
