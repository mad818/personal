import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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
const collectTsxSources = (relativeDirectory) => {
  const sources = [];
  const pending = [path.join(repoRoot, relativeDirectory)];

  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        sources.push({
          relativePath: path
            .relative(repoRoot, absolutePath)
            .replaceAll("\\", "/"),
          source: fs.readFileSync(absolutePath, "utf8"),
        });
      }
    }
  }

  return sources;
};

const nativeDialogNames = new Set(["alert", "confirm", "prompt"]);
const browserGlobalNames = new Set(["globalThis", "self", "window"]);

const getNativeDialogName = (expression) => {
  if (ts.isIdentifier(expression) && nativeDialogNames.has(expression.text)) {
    return expression.text;
  }

  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    browserGlobalNames.has(expression.expression.text) &&
    nativeDialogNames.has(expression.name.text)
  ) {
    return expression.name.text;
  }

  if (
    ts.isElementAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    browserGlobalNames.has(expression.expression.text) &&
    expression.argumentExpression &&
    ts.isStringLiteralLike(expression.argumentExpression) &&
    nativeDialogNames.has(expression.argumentExpression.text)
  ) {
    return expression.argumentExpression.text;
  }

  return null;
};

const findNativeDialogCalls = (source, relativePath) => {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const calls = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const name = getNativeDialogName(node.expression);
      if (name) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        calls.push({
          name,
          line: location.line + 1,
          column: location.character + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return calls;
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
const homeChat = read("components/home/HomeChat.tsx");
const actionDialogHook = read("hooks/useActionDialog.ts");
const actionDialog = read("components/ui/ActionDialog.tsx");
const trustOperations = read("components/ui/TrustOperationsRail.tsx");
const trustPosture = read("components/ui/TrustPostureStrip.tsx");
const actionDialogAdopters = [
  ["secure link removal", read("components/resources/SecureLinkOpenPanel.tsx")],
  [
    "media intake duplicate review",
    read("components/resources/MediaIntakeReviewPanel.tsx"),
  ],
  [
    "media library actions",
    read("components/resources/MediaEscapeLibrary.tsx"),
  ],
  ["backup restore", read("components/resources/EscapeAccessBackupPanel.tsx")],
  ["phone install notice", read("components/ui/FreeLocalReadinessPanel.tsx")],
];
const routeEntryControls = [
  [
    "global command bar",
    read("components/ui/CommandBar.tsx"),
    ['aria-label="Command bar prompt"'],
  ],
  [
    "HQ command entry",
    read("components/home/office/HQTerminalSection.tsx"),
    ['aria-label="HQ command input"'],
  ],
  [
    "COMMAND job-risk entry",
    read("components/command/JobRiskAnalyzer.tsx"),
    ['aria-label="Job title or role"'],
  ],
  [
    "INTEL paper-research entry",
    read("components/intel/PapersResearchPanel.tsx"),
    ['aria-label="Paper research topic"'],
  ],
  [
    "ALPHA watchlist entry",
    read("components/alpha/WatchlistManager.tsx"),
    ['aria-label="CoinGecko asset ID"'],
  ],
  [
    "CYBER vulnerability-review entry",
    read("components/cyber/VulnerabilityReviewWorkbench.tsx"),
    [
      'aria-label="Repository file to review"',
      'aria-label="Vulnerability review goal"',
    ],
  ],
  [
    "RECON lookup entry",
    read("components/recon/ReconLookup.tsx"),
    ['aria-label="Recon target"', 'aria-label="Recon target type"'],
  ],
  [
    "VAULT search entry",
    read("components/vault/VaultSearch.tsx"),
    [
      'aria-label="Search vault"',
      'aria-label="Vault category"',
      'aria-label="Vault sort order"',
    ],
  ],
  [
    "SKILLS task-routing entry",
    read("components/skills/SkillLibrary.tsx"),
    ['aria-label="Describe task to route to skills"'],
  ],
  [
    "RESOURCES session-finder entry",
    read("components/resources/SessionFinderConsole.tsx"),
    ['aria-label="Search Nexus sessions"'],
  ],
  [
    "IOT device entry",
    read("components/iot/DeviceRegistry.tsx"),
    ['aria-label={field.label}', 'aria-label="Device protocol"'],
  ],
  [
    "VEHICLE control entry",
    read("components/vehicle/ControlPanel.tsx"),
    ['aria-label="Vehicle speed limit"'],
  ],
];

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
  'import { toast } from "@/components/ui/Toast"',
  'const response = await fetch("/api/tools", {',
  "if (!response.ok)",
  'title: "Claude key required"',
  'title: "Draft finalized"',
  'title: "Draft not finalized"',
  "disabled={finalizingId === d.id}",
]) {
  requireText(homeChat, text, "HomeChat draft finalization feedback");
}

for (const text of [
  "export function useActionDialog",
  "new Promise<boolean>",
  "previousResolver?.(false)",
  "resolverRef.current?.(false)",
  "setDialog(null)",
]) {
  requireText(actionDialogHook, text, "action-dialog controller");
}

for (const text of [
  'import { createPortal } from "react-dom"',
  "useModalDialog({ open, onClose })",
  'role = "alertdialog"',
  'aria-modal="true"',
  "aria-labelledby={titleId}",
  "aria-describedby={descriptionId}",
  "data-dialog-initial-focus",
  'type="password"',
  'autoComplete="off"',
  "validateToken(token, {",
  "persistOnSuccess: true",
  "elevate: true",
  "if (!busy) onClose()",
  'role="alert"',
  'className="nexus-action-dialog__error"',
]) {
  requireText(actionDialog, text, "shared action dialogs");
}
for (const forbiddenText of [
  "rgba(",
  "#ef4444",
  "localStorage",
  "sessionStorage",
]) {
  if (
    actionDialog.includes(forbiddenText) ||
    actionDialogHook.includes(forbiddenText)
  ) {
    errors.push(
      `shared action dialogs: hardcoded or persistent presentation remains: ${forbiddenText}`,
    );
  }
}

for (const [label, source] of actionDialogAdopters) {
  requireText(source, "useActionDialog()", label);
  requireText(source, "requestActionDialog({", label);
  requireText(source, "<ActionDialog controller={actionDialog} />", label);
}

for (const [label, source, requiredNames] of routeEntryControls) {
  for (const accessibleName of requiredNames) {
    requireText(source, accessibleName, `${label} accessible name`);
  }
}
for (const [label, source] of [
  ["trust operations step-up", trustOperations],
  ["trust posture step-up", trustPosture],
]) {
  requireText(source, "<StepUpAccessDialog", label);
  requireText(source, "open={stepUpOpen}", label);
  requireText(source, "onResult={handleRevalidationResult}", label);
  requireText(source, 'role="status"', label);
  requireText(source, 'aria-live="polite"', label);
}

const nativeDialogFixtureCalls = findNativeDialogCalls(
  `
    alert("notice");
    confirm("continue?");
    prompt("token");
    window.alert("notice");
    globalThis.confirm("continue?");
    self["prompt"]("token");
    notifier.alert("allowed component method");
  `,
  "native-dialog-fixture.tsx",
);
if (
  nativeDialogFixtureCalls.length !== 6 ||
  nativeDialogFixtureCalls.map((call) => call.name).join(",") !==
    "alert,confirm,prompt,alert,confirm,prompt"
) {
  errors.push(
    "native browser dialog: AST self-test must detect bare and explicitly global calls without rejecting component methods",
  );
}

for (const { relativePath, source } of [
  ...collectTsxSources("app"),
  ...collectTsxSources("components"),
]) {
  for (const call of findNativeDialogCalls(source, relativePath)) {
    errors.push(
      `native browser dialog: ${relativePath}:${call.line}:${call.column} still calls ${call.name}()`,
    );
  }
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

for (const text of [
  ".nexus-action-dialog__overlay {",
  ".nexus-action-dialog {",
  '.nexus-action-dialog[data-tone="danger"]',
  ".nexus-action-dialog__input:focus-visible {",
  ".nexus-action-dialog__button:focus-visible {",
  "@keyframes nexus-action-dialog-frame-in",
  'html[data-nexus-motion-profile="reduced"] .nexus-action-dialog__overlay',
  "@media (prefers-reduced-motion: reduce)",
  "@media (max-width: 560px)",
]) {
  requireText(styles, text, "action-dialog styling");
}

if (errors.length > 0) {
  console.error("Shell accessibility validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Shell accessibility OK (skip path, route orientation, navigation semantics, modal focus containment, route resilience, toast feedback, product-native action dialogs, route entry control names, and reduced motion).\n",
);
