import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
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

for (const text of [
  "function SkipToMainContent()",
  'href="#nexus-main-content"',
  'data-testid="nexus-skip-link"',
  "main.focus({ preventScroll: true })",
  "function RouteAnnouncement",
  'aria-live="polite"',
  "document.title = nextTitle",
  "workspace loaded",
  'aria-label={`${routeBranding.visibleLabel} workspace`}',
  'id="nexus-main-content"',
  "tabIndex={-1}",
]) {
  requireText(chrome, text, "shared chrome");
}

requireText(landing, 'id="nexus-main-content"', "public landing");
requireText(landing, "tabIndex={-1}", "public landing");
requireText(nav, 'aria-label="Primary navigation"', "navigation landmark");
if (nav.includes('role="tablist"')) {
  errors.push("navigation landmark: route links must not be exposed as an ARIA tablist");
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
requireText(notifications, "disabled={notif.read}", "notification keyboard action");

if (errors.length > 0) {
  console.error("Shell accessibility validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Shell accessibility OK (skip path, route orientation, navigation semantics, modal focus containment, and reduced motion).\n",
);
