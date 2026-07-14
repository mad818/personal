import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const errors = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) errors.push(`${label}: missing ${text}`);
};

const chrome = read("components/ui/RootLayoutChrome.tsx");
const landing = read("components/landing/LandingPage.tsx");
const nav = read("components/nav/Nav.tsx");
const styles = read("app/globals.css");
const modalHook = read("hooks/useModalDialog.ts");
const settings = read("components/settings/SettingsDrawer.tsx");
const notifications = read("components/ui/NotificationCenter.tsx");
const tradeThesis = read("components/alpha/TradeThesisPanel.tsx");
const routeState = read("components/ui/RouteStatePanel.tsx");
const routeLoading = read("app/loading.tsx");
const routeError = read("app/error.tsx");
const globalError = read("app/global-error.tsx");
const notFound = read("app/not-found.tsx");
const rootErrorBoundary = read("components/system/ErrorBoundary.tsx");
const toast = read("components/ui/Toast.tsx");
const notificationToastBridge = read(
  "components/ui/NotificationToastBridge.tsx",
);

for (const text of [
  "function SkipToMainContent()",
  'href="#nexus-main-content"',
  'data-testid="nexus-skip-link"',
  "main.focus({ preventScroll: true })",
  "function RouteAnnouncement",
  'aria-live="polite"',
  "document.title = nextTitle",
  "workspace loaded",
  "aria-label={`${routeBranding.visibleLabel} workspace`}",
  'id="nexus-main-content"',
  "tabIndex={-1}",
]) {
  requireText(chrome, text, "shared chrome");
}

requireText(landing, 'id="nexus-main-content"', "public landing");
requireText(landing, "tabIndex={-1}", "public landing");
requireText(nav, 'aria-label="Primary navigation"', "navigation landmark");
if (nav.includes('role="tablist"')) {
  errors.push(
    "navigation landmark: route links must not be exposed as an ARIA tablist",
  );
}

for (const text of [
  ".nexus-skip-link {",
  ".nexus-skip-link:focus-visible {",
  "transform: translateY(0);",
  "@media (prefers-reduced-motion: reduce)",
]) {
  requireText(styles, text, "skip-link styling");
}

for (const text of [
  "export function useModalDialog",
  'event.key === "Escape"',
  'event.key !== "Tab"',
  'document.addEventListener("keydown", onKeyDown, true)',
  'document.body.style.overflow = "hidden"',
  "previouslyFocused.focus({ preventScroll: true })",
  'querySelector<HTMLElement>("[data-dialog-initial-focus]")',
]) {
  requireText(modalHook, text, "modal focus contract");
}

for (const [label, source, titleId] of [
  ["settings dialog", settings, "nexus-settings-title"],
  ["notifications dialog", notifications, "nexus-notifications-title"],
  ["trade thesis dialog", tradeThesis, "nexus-trade-thesis-title"],
]) {
  requireText(source, "useModalDialog({", label);
  requireText(source, 'role="dialog"', label);
  requireText(source, 'aria-modal="true"', label);
  requireText(source, `aria-labelledby="${titleId}"`, label);
  requireText(source, `id="${titleId}"`, label);
  requireText(source, "data-dialog-initial-focus", label);
  requireText(source, "tabIndex={-1}", label);
}

requireText(
  notifications,
  "Mark notification as read:",
  "notification keyboard action",
);
requireText(
  notifications,
  "disabled={notif.read}",
  "notification keyboard action",
);

for (const text of [
  'export type RouteStateKind = "loading" | "error" | "not-found"',
  'id={asMain ? "nexus-main-content" : undefined}',
  'role={kind === "error" ? "alert" : "status"}',
  'aria-live={kind === "error" ? "assertive" : "polite"}',
  'aria-busy={kind === "loading" ? true : undefined}',
  'className="nexus-route-state__signal"',
  "debugDetail ? (",
]) {
  requireText(routeState, text, "shared route-state plane");
}

for (const text of [
  'kind="loading"',
  'announcement="Nexus workspace loading"',
  'asMain={pathname === "/"}',
]) {
  requireText(routeLoading, text, "route loading state");
}

for (const [label, source, requiredTexts] of [
  [
    "segment error state",
    routeError,
    [
      'source: "AppRouter:segment"',
      'process.env.NODE_ENV !== "production"',
      "onClick={reset}",
      'kind="error"',
      "getDefaultEntrypoint()",
    ],
  ],
  [
    "global error state",
    globalError,
    [
      'source: "AppRouter:root"',
      '<html lang="en">',
      '<body className="nexus-global-error-body">',
      "onClick={reset}",
      "window.location.assign(getDefaultEntrypoint())",
      "asMain",
    ],
  ],
  [
    "not-found state",
    notFound,
    [
      'kind="not-found"',
      "getDefaultEntrypoint()",
      "router.back()",
      "Workspace not found",
    ],
  ],
]) {
  for (const text of requiredTexts) requireText(source, text, label);
}

for (const text of [
  'import RouteStatePanel from "@/components/ui/RouteStatePanel"',
  'testId="root-error-boundary-state"',
  'process.env.NODE_ENV !== "production" && error',
  "onClick={() => window.location.reload()}",
]) {
  requireText(rootErrorBoundary, text, "root React error boundary");
}
for (const legacyText of [
  "SYSTEM FAULT",
  "Show stack trace",
  "Sadie Sink rose/gold",
]) {
  if (rootErrorBoundary.includes(legacyText)) {
    errors.push(
      `root React error boundary: legacy fallback remains: ${legacyText}`,
    );
  }
}

for (const text of [
  "useReducedMotion",
  'role={urgent ? "alert" : "status"}',
  'aria-live={urgent ? "assertive" : "polite"}',
  'aria-atomic="true"',
  "const paused = hovered || focusWithin || documentHidden",
  'document.addEventListener("visibilitychange", handleVisibilityChange)',
  "onFocusCapture={() => setFocusWithin(true)}",
  "aria-label={`Dismiss ${item.title}`}",
  'className="nexus-toast-region"',
]) {
  requireText(toast, text, "shared toast feedback");
}
for (const hardcodedColor of ["SEVERITY_COLORS", "rgba(", "#ef4444"]) {
  if (toast.includes(hardcodedColor)) {
    errors.push(
      `shared toast feedback: hardcoded presentation remains: ${hardcodedColor}`,
    );
  }
}

for (const text of [
  "storePersist?.hasHydrated?.()",
  "storePersist.onFinishHydration",
  "if (!seededRef.current)",
  "notifications.map((notification) => notification.id)",
]) {
  requireText(notificationToastBridge, text, "notification toast hydration");
}
const toastSeedIndex = notificationToastBridge.indexOf(
  "if (!seededRef.current)",
);
const toastEmitIndex = notificationToastBridge.indexOf(
  "for (const notification of notifications)",
);
if (
  toastSeedIndex === -1 ||
  toastEmitIndex === -1 ||
  toastSeedIndex > toastEmitIndex
) {
  errors.push(
    "notification toast hydration: persisted IDs must seed before new notifications emit",
  );
}

for (const text of [
  ".nexus-route-state {",
  '.nexus-route-state[data-main="true"]',
  '.nexus-route-state[data-kind="loading"] .nexus-route-state__signal::after',
  "@keyframes nexus-route-state-scan",
  'html[data-nexus-motion-profile="reduced"]',
  "@media (prefers-reduced-motion: reduce)",
  ".nexus-global-error-body {",
]) {
  requireText(styles, text, "route-state styling");
}

for (const text of [
  ".nexus-toast-region {",
  ".nexus-toast {",
  '.nexus-toast[data-severity="critical"]',
  ".nexus-toast__dismiss:focus-visible {",
  'html[data-nexus-motion-profile="reduced"] .nexus-toast__progress-fill',
  "@media (prefers-reduced-motion: reduce)",
]) {
  requireText(styles, text, "toast feedback styling");
}

if (errors.length > 0) {
  console.error("Shell accessibility validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Shell accessibility OK (skip path, route orientation, navigation semantics, modal focus containment, route resilience, toast feedback, and reduced motion).\n",
);
