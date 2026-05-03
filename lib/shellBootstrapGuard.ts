import { getDefaultEntrypoint } from "@/lib/releaseMatrix";
import {
  SHELL_HEAL_STORAGE_PREFIX,
  TARGETED_VIEW_STORAGE_KEYS,
} from "@/lib/shellRecoveryState";

const BOOT_RECOVERY_ATTR = "data-nexus-shell-boot";
const BOOT_RECOVERY_ID = "nexus-shell-bootstrap-recovery";
const MAX_BOOT_AUTO_RELOADS = 1;
const BOOT_CHECK_DELAYS_MS = [2400, 9000];

export function getCriticalShellCss() {
  return `
    html:not([data-nexus-hydrated="1"]) body {
      background: #030713;
      color: #ebf5ff;
    }

    html:not([data-nexus-hydrated="1"]) main {
      padding-top: 96px !important;
      min-height: 100vh;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 10px 16px 0;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__inner {
      min-height: 96px;
      max-width: 1460px;
      margin: 0 auto;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid rgba(212,149,106,.1);
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(18,12,14,.88), rgba(10,7,8,.94)),
        radial-gradient(circle at 100% 0%, rgba(212,149,106,.08), transparent 24%);
      box-shadow: 0 22px 50px rgba(0,0,0,.34);
      overflow: hidden;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__brand {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: fit-content;
      text-decoration: none;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__eyebrow {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #f59e0b;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__subtitle {
      font-size: 12px;
      font-weight: 700;
      color: #b6c9df;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__tabs {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 2px;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 16px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.03);
      background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01));
      color: #93acc6;
      text-decoration: none;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .04em;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-toprail__meta {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    html:not([data-nexus-hydrated="1"]) .nexus-shell-badge,
    html:not([data-nexus-hydrated="1"]) .nexus-toprail__icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 42px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.1);
      background: rgba(255,255,255,.04);
      color: #b6c9df;
      text-decoration: none;
    }

    #${BOOT_RECOVERY_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2500;
      width: min(420px, calc(100vw - 32px));
      display: none;
      flex-direction: column;
      gap: 12px;
      padding: 16px 18px;
      border-radius: 22px;
      border: 1px solid rgba(245, 158, 11, 0.24);
      background:
        linear-gradient(180deg, rgba(12, 18, 29, 0.96), rgba(6, 11, 20, 0.98));
      box-shadow: 0 26px 70px rgba(0,0,0,.52);
      color: #f7fbff;
    }

    html[${BOOT_RECOVERY_ATTR}="recovery"] #${BOOT_RECOVERY_ID} {
      display: flex;
    }

    .nexus-shell-bootstrap-recovery__badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.22);
      color: #fcd79d;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .nexus-shell-bootstrap-recovery__title {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #f7fbff;
    }

    .nexus-shell-bootstrap-recovery__text,
    .nexus-shell-bootstrap-recovery__note {
      font-size: 13px;
      line-height: 1.65;
      color: rgba(223, 239, 248, 0.84);
    }

    .nexus-shell-bootstrap-recovery__note {
      font-size: 11px;
      color: rgba(163, 190, 210, 0.82);
    }

    .nexus-shell-bootstrap-recovery__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nexus-shell-bootstrap-recovery__button {
      min-height: 38px;
      border-radius: 999px;
      padding: 0 12px;
      font-weight: 800;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      color: #f1f8ff;
    }

    .nexus-shell-bootstrap-recovery__button--primary {
      border-color: rgba(103, 232, 249, 0.22);
      background: rgba(103, 232, 249, 0.08);
      color: #def9ff;
    }

    .nexus-shell-bootstrap-recovery__button--warn {
      border-color: rgba(245, 158, 11, 0.22);
      background: rgba(245, 158, 11, 0.08);
      color: #ffe4b0;
    }
  `;
}

export function buildShellBootstrapGuardScript() {
  const storageKeys = JSON.stringify(TARGETED_VIEW_STORAGE_KEYS);
  const defaultEntrypoint = JSON.stringify(getDefaultEntrypoint());
  const storagePrefix = JSON.stringify(SHELL_HEAL_STORAGE_PREFIX);
  const recoveryId = JSON.stringify(BOOT_RECOVERY_ID);
  const recoveryAttr = JSON.stringify(BOOT_RECOVERY_ATTR);
  const delays = JSON.stringify(BOOT_CHECK_DELAYS_MS);

  return `
    (function () {
      try {
        var STORAGE_PREFIX = ${storagePrefix};
        var RECOVERY_ID = ${recoveryId};
        var RECOVERY_ATTR = ${recoveryAttr};
        var DEFAULT_ENTRYPOINT = ${defaultEntrypoint};
        var MAX_AUTO_RELOADS = ${MAX_BOOT_AUTO_RELOADS};
        var CHECK_DELAYS = ${delays};
        var TARGETED_VIEW_STORAGE_KEYS = ${storageKeys};
        var isPublicLanding = window.location.pathname === "/";
        var hasBootReloadMarker = false;

        try {
          hasBootReloadMarker = new URL(window.location.href).searchParams.has("__shellHeal");
        } catch (_error) {
          hasBootReloadMarker = window.location.search.indexOf("__shellHeal") !== -1;
        }

        if (isPublicLanding) {
          document.documentElement.removeAttribute(RECOVERY_ATTR);
          return;
        }

        function buildStorageKey() {
          return STORAGE_PREFIX + window.location.pathname;
        }

        function buildReloadUrl() {
          try {
            var url = new URL(window.location.href);
            url.searchParams.set("__shellHeal", Date.now().toString());
            return url.toString();
          } catch (_error) {
            return window.location.href;
          }
        }

        function readAttemptCount(storageKey) {
          try {
            var raw = window.sessionStorage.getItem(storageKey);
            if (!raw) return 0;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.count !== "number" || typeof parsed.ts !== "number") {
              return 0;
            }
            if (Date.now() - parsed.ts > 60000) {
              window.sessionStorage.removeItem(storageKey);
              return 0;
            }
            return parsed.count;
          } catch (_error) {
            return 0;
          }
        }

        function writeAttemptCount(storageKey, count) {
          try {
            window.sessionStorage.setItem(
              storageKey,
              JSON.stringify({ count: count, ts: Date.now() })
            );
          } catch (_error) {}
        }

        function clearAttemptCount(storageKey) {
          try {
            window.sessionStorage.removeItem(storageKey);
          } catch (_error) {}
        }

        function clearTargetedViewState() {
          try {
            for (var i = 0; i < TARGETED_VIEW_STORAGE_KEYS.length; i += 1) {
              window.localStorage.removeItem(TARGETED_VIEW_STORAGE_KEYS[i]);
            }
          } catch (_error) {}
        }

        function shellHydrated() {
          return document.documentElement.getAttribute("data-nexus-hydrated") === "1";
        }

        function authGateVisible() {
          return Boolean(document.querySelector('[data-testid="auth-gate"]'));
        }

        function markStaticAssetFailure(target) {
          if (!target || !(target instanceof Element)) return false;
          var tagName = target.tagName;
          if (tagName !== "LINK" && tagName !== "SCRIPT") return false;
          var assetUrl =
            tagName === "LINK"
              ? target.getAttribute("href") || ""
              : target.getAttribute("src") || "";
          if (
            !assetUrl ||
            (assetUrl.indexOf("/_next/static/css/") === -1 &&
              assetUrl.indexOf("/_next/static/chunks/") === -1)
          ) {
            return false;
          }
          target.setAttribute("data-nexus-static-failed", "1");
          return true;
        }

        function shellAssetsHealthy(isFinalAttempt) {
          var cssLinks = document.querySelectorAll('link[rel="stylesheet"][href*="/_next/static/css/"]');
          if (!cssLinks.length) {
            return !isFinalAttempt;
          }

          for (var i = 0; i < cssLinks.length; i += 1) {
            var link = cssLinks[i];
            if (!(link instanceof HTMLLinkElement)) continue;
            if (link.getAttribute("data-nexus-static-failed") === "1") {
              return false;
            }
            if (!isFinalAttempt) {
              continue;
            }
            if (!link.sheet) {
              return false;
            }
          }

          return true;
        }

        function shellLooksHealthy(isFinalAttempt) {
          if (authGateVisible()) return true;
          if (!shellAssetsHealthy(isFinalAttempt)) return false;
          if (isFinalAttempt && !shellHydrated()) {
            return false;
          }

          var toprail = document.querySelector(".nexus-toprail");
          if (!(toprail instanceof HTMLElement)) {
            return !isFinalAttempt;
          }

          if (window.getComputedStyle(toprail).position !== "fixed") {
            return false;
          }

          var main = document.querySelector("main");
          if (!(main instanceof HTMLElement)) {
            return !isFinalAttempt;
          }

          var mainPaddingTop = Number.parseFloat(window.getComputedStyle(main).paddingTop || "0");
          if (!Number.isFinite(mainPaddingTop) || mainPaddingTop < 60) {
            return false;
          }

          return true;
        }

        function appendTextNode(parent, tagName, className, text) {
          var node = document.createElement(tagName);
          if (className) node.className = className;
          node.textContent = text;
          parent.appendChild(node);
          return node;
        }

        function appendActionButton(parent, action, label, extraClass) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "nexus-shell-bootstrap-recovery__button" + (extraClass ? " " + extraClass : "");
          button.setAttribute("data-action", action);
          button.textContent = label;
          parent.appendChild(button);
          return button;
        }

        function ensureRecoveryOverlay(storageKey) {
          if (document.getElementById(RECOVERY_ID)) return;

          var overlay = document.createElement("div");
          overlay.id = RECOVERY_ID;
          overlay.setAttribute("data-testid", "shell-bootstrap-recovery");
          appendTextNode(
            overlay,
            "div",
            "nexus-shell-bootstrap-recovery__badge",
            "Shell bootstrap recovery"
          );
          appendTextNode(
            overlay,
            "div",
            "nexus-shell-bootstrap-recovery__title",
            "The shell did not fully load."
          );
          appendTextNode(
            overlay,
            "div",
            "nexus-shell-bootstrap-recovery__text",
            "Nexus tried a one-time automatic reload. You can recover without getting stuck on an unstyled or half-mounted screen."
          );
          var actions = document.createElement("div");
          actions.className = "nexus-shell-bootstrap-recovery__actions";
          appendActionButton(
            actions,
            "reload",
            "Reload shell",
            "nexus-shell-bootstrap-recovery__button--primary"
          );
          appendActionButton(
            actions,
            "reset",
            "Reset local view state",
            "nexus-shell-bootstrap-recovery__button--warn"
          );
          appendActionButton(actions, "hq", "Open HQ");
          overlay.appendChild(actions);
          appendTextNode(
            overlay,
            "div",
            "nexus-shell-bootstrap-recovery__note",
            "Reset clears local layout and filter state only. It does not remove durable saved artifacts."
          );

          overlay.addEventListener("click", function (event) {
            var target = event.target;
            if (!(target instanceof HTMLElement)) return;
            var action = target.getAttribute("data-action");
            if (!action) return;
            if (action === "reload") {
              clearAttemptCount(storageKey);
              window.location.assign(buildReloadUrl());
              return;
            }
            if (action === "reset") {
              clearTargetedViewState();
              clearAttemptCount(storageKey);
              window.location.assign(buildReloadUrl());
              return;
            }
            if (action === "hq") {
              clearAttemptCount(storageKey);
              window.location.assign(DEFAULT_ENTRYPOINT);
            }
          });

          document.body.appendChild(overlay);
        }

        function enableRecovery(storageKey) {
          document.documentElement.setAttribute(RECOVERY_ATTR, "recovery");
          ensureRecoveryOverlay(storageKey);
        }

        function runCheck(storageKey, isFinalAttempt) {
          if (shellLooksHealthy(isFinalAttempt)) {
            clearAttemptCount(storageKey);
            document.documentElement.removeAttribute(RECOVERY_ATTR);
            return;
          }

          if (!isFinalAttempt) return;

          var attempts = readAttemptCount(storageKey);
          if (!hasBootReloadMarker && attempts < MAX_AUTO_RELOADS) {
            writeAttemptCount(storageKey, attempts + 1);
            window.location.assign(buildReloadUrl());
            return;
          }

          enableRecovery(storageKey);
        }

        var storageKey = buildStorageKey();
        window.addEventListener("error", function (event) {
          if (!markStaticAssetFailure(event.target)) return;
          if (authGateVisible()) return;
          window.setTimeout(function () {
            runCheck(storageKey, true);
          }, 60);
        }, true);

        for (var i = 0; i < CHECK_DELAYS.length; i += 1) {
          (function (delay, finalAttempt) {
            window.setTimeout(function () {
              runCheck(storageKey, finalAttempt);
            }, delay);
          })(CHECK_DELAYS[i], i === CHECK_DELAYS.length - 1);
        }

        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState !== "visible") return;
          if (shellLooksHealthy(true)) {
            clearAttemptCount(storageKey);
            document.documentElement.removeAttribute(RECOVERY_ATTR);
            return;
          }
          if (authGateVisible()) return;
          enableRecovery(storageKey);
        });
      } catch (_error) {
        // Never let bootstrap recovery break initial page load.
      }
    })();
  `;
}
