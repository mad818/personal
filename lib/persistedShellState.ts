import { normalizePreferredAIProvider } from "@/lib/aiProviderPreference";
import { CLIENT_SENSITIVE_SETTINGS_KEYS } from "@/lib/clientSettingsBoundary";

export const PERSISTED_SHELL_STATE_NOTICE_KEY =
  "nexus:shell-state-healed:v1";

const NEXUS_SETTINGS_STORAGE_KEY = "nexus-settings";
const VAULT_GRAPH_FILTERS_STORAGE_KEY = "nexus:vault-graph-filters:v1";
const SCHEDULER_AUDIT_FILTER_STORAGE_KEY =
  "nexus:scheduler-audit-filters:v1";
const SCHEDULER_AUDIT_VIEWS_STORAGE_KEY = "nexus:scheduler-audit-views:v1";
const HQ_SPLIT_LOCK_STORAGE_KEY = "nexus_hq_split_drag_locked";
const CLICK_DEBUG_STORAGE_KEY = "nexus_click_debug";

const VALID_OFFICE_SCENE_MODES = ["auto", "morning", "afternoon", "night"] as const;
const VALID_OFFICE_CAMERA_PRESETS = [
  "cinematic",
  "closeOps",
  "wallReadability",
] as const;
const VALID_OFFICE_OPERATIONAL_MODES = ["normal", "war", "nightOps"] as const;
const VALID_SURFACE_MOTION_PROFILES = [
  "reduced",
  "standard",
  "flagship",
] as const;
const VALID_OFFICE_VFX_QUALITIES = ["off", "low", "high"] as const;
const VALID_ACTIVE_PERSONAS = ["formal", "direct", "deep"] as const;
const VALID_GRAPH_SOURCE_FILTERS = ["all", "clips", "compiled"] as const;
const VALID_GRAPH_VISIBILITY_FILTERS = [
  "all",
  "safe",
  "sensitive",
  "restricted",
] as const;
const VALID_SCHEDULER_AUDIT_LANES = [
  "all",
  "single_run",
  "internal_batch",
  "provider_native_batch",
] as const;
const VALID_SCHEDULER_AUDIT_STATUSES = ["all", "ok", "error"] as const;
const VALID_SCHEDULER_AUDIT_WINDOWS = ["all", "24h", "7d"] as const;
const SENSITIVE_SETTINGS_KEYS = CLIENT_SENSITIVE_SETTINGS_KEYS;

function buildEnumCheck(values: readonly string[]) {
  const quoted = values.map((value) => JSON.stringify(value)).join(",");
  return `function(value){return [${quoted}].indexOf(value) !== -1;}`;
}

export function buildPersistedShellStateRepairScript() {
  const normalizeAdvancedDefault = normalizePreferredAIProvider(
    "ollama",
    { allowAdvanced: false },
  );

  return `
    (function () {
      try {
        var local = window.localStorage;
        var session = window.sessionStorage;
        var healed = [];
        var cleared = [];

        var NOTICE_KEY = ${JSON.stringify(PERSISTED_SHELL_STATE_NOTICE_KEY)};
        var SETTINGS_KEY = ${JSON.stringify(NEXUS_SETTINGS_STORAGE_KEY)};
        var GRAPH_KEY = ${JSON.stringify(VAULT_GRAPH_FILTERS_STORAGE_KEY)};
        var AUDIT_FILTERS_KEY = ${JSON.stringify(
          SCHEDULER_AUDIT_FILTER_STORAGE_KEY,
        )};
        var AUDIT_VIEWS_KEY = ${JSON.stringify(
          SCHEDULER_AUDIT_VIEWS_STORAGE_KEY,
        )};
        var SPLIT_LOCK_KEY = ${JSON.stringify(HQ_SPLIT_LOCK_STORAGE_KEY)};
        var CLICK_DEBUG_KEY = ${JSON.stringify(CLICK_DEBUG_STORAGE_KEY)};

        var isValidOfficeSceneMode = ${buildEnumCheck(VALID_OFFICE_SCENE_MODES)};
        var isValidOfficeCameraPreset = ${buildEnumCheck(
          VALID_OFFICE_CAMERA_PRESETS,
        )};
        var isValidOfficeOperationalMode = ${buildEnumCheck(
          VALID_OFFICE_OPERATIONAL_MODES,
        )};
        var isValidSurfaceMotionProfile = ${buildEnumCheck(
          VALID_SURFACE_MOTION_PROFILES,
        )};
        var isValidOfficeVfxQuality = ${buildEnumCheck(
          VALID_OFFICE_VFX_QUALITIES,
        )};
        var isValidActivePersona = ${buildEnumCheck(VALID_ACTIVE_PERSONAS)};
        var isValidGraphSource = ${buildEnumCheck(VALID_GRAPH_SOURCE_FILTERS)};
        var isValidGraphVisibility = ${buildEnumCheck(
          VALID_GRAPH_VISIBILITY_FILTERS,
        )};
        var isValidAuditLane = ${buildEnumCheck(VALID_SCHEDULER_AUDIT_LANES)};
        var isValidAuditStatus = ${buildEnumCheck(
          VALID_SCHEDULER_AUDIT_STATUSES,
        )};
        var isValidAuditWindow = ${buildEnumCheck(
          VALID_SCHEDULER_AUDIT_WINDOWS,
        )};
        var SENSITIVE_SETTINGS_KEYS = ${JSON.stringify(SENSITIVE_SETTINGS_KEYS)};

        function isObject(value) {
          return !!value && typeof value === "object" && !Array.isArray(value);
        }

        function clampNumber(value, min, max, fallback) {
          if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
          if (value < min) return min;
          if (value > max) return max;
          return value;
        }

        function normalizeProvider(value, allowAdvanced) {
          var normalized =
            typeof value === "string" ? value.trim().toLowerCase() : "";
          if (normalized === "local") normalized = "ollama";
          if (
            normalized === "ollama" ||
            normalized === "groq" ||
            normalized === "google"
          ) {
            return normalized;
          }
          if (
            allowAdvanced &&
            (normalized === "anthropic" ||
              normalized === "openai" ||
              normalized === "minimax")
          ) {
            return normalized;
          }
          return ${JSON.stringify(normalizeAdvancedDefault)};
        }

        function writeNotice() {
          if (!healed.length && !cleared.length) return;
          session.setItem(
            NOTICE_KEY,
            JSON.stringify({
              healed: healed,
              cleared: cleared,
              ts: Date.now(),
            }),
          );
        }

        var rawSettings = local.getItem(SETTINGS_KEY);
        if (typeof rawSettings === "string" && rawSettings.length > 0) {
          try {
            var parsedSettings = JSON.parse(rawSettings);
            if (!isObject(parsedSettings) || !isObject(parsedSettings.state)) {
              throw new Error("invalid persisted root shape");
            }

            var nextSettingsRoot = Object.assign({}, parsedSettings);
            var nextState = Object.assign({}, parsedSettings.state);
            var settings = isObject(nextState.settings)
              ? Object.assign({}, nextState.settings)
              : {};
            var changedSettings = false;

            for (var sensitiveIndex = 0; sensitiveIndex < SENSITIVE_SETTINGS_KEYS.length; sensitiveIndex += 1) {
              var sensitiveKey = SENSITIVE_SETTINGS_KEYS[sensitiveIndex];
              if (
                Object.prototype.hasOwnProperty.call(settings, sensitiveKey) &&
                settings[sensitiveKey]
              ) {
                settings[sensitiveKey] = "";
                changedSettings = true;
              }
            }

            var allowAdvancedProviders = Boolean(settings.allowAdvancedProviders);
            var normalizedProvider = normalizeProvider(
              settings.aiProvider,
              allowAdvancedProviders,
            );
            if (settings.aiProvider !== normalizedProvider) {
              settings.aiProvider = normalizedProvider;
              changedSettings = true;
            }

            var normalizedSplitHeight = clampNumber(
              settings.officeSplitHeightPx,
              0,
              700,
              0,
            );
            if (settings.officeSplitHeightPx !== normalizedSplitHeight) {
              settings.officeSplitHeightPx = normalizedSplitHeight;
              changedSettings = true;
            }

            var normalizedMotion = clampNumber(settings.officeMotion, 0, 1, 1);
            if (settings.officeMotion !== normalizedMotion) {
              settings.officeMotion = normalizedMotion;
              changedSettings = true;
            }

            if (!isValidOfficeSceneMode(settings.officeSceneMode)) {
              settings.officeSceneMode = "auto";
              changedSettings = true;
            }
            if (!isValidOfficeCameraPreset(settings.officeCameraPreset)) {
              settings.officeCameraPreset = "cinematic";
              changedSettings = true;
            }
            if (!isValidOfficeOperationalMode(settings.officeOperationalMode)) {
              settings.officeOperationalMode = "normal";
              changedSettings = true;
            }
            if (!isValidSurfaceMotionProfile(settings.surfaceMotionProfile)) {
              settings.surfaceMotionProfile = "flagship";
              changedSettings = true;
            }
            if (!isValidOfficeVfxQuality(settings.officeVfxQuality)) {
              settings.officeVfxQuality = "low";
              changedSettings = true;
            }

            if (!isValidActivePersona(nextState.activePersona)) {
              nextState.activePersona = "formal";
              changedSettings = true;
            }

            if (changedSettings) {
              nextState.settings = settings;
              nextSettingsRoot.state = nextState;
              local.setItem(SETTINGS_KEY, JSON.stringify(nextSettingsRoot));
              healed.push(SETTINGS_KEY);
            }
          } catch (_error) {
            local.removeItem(SETTINGS_KEY);
            cleared.push(SETTINGS_KEY);
          }
        }

        var rawGraphFilters = local.getItem(GRAPH_KEY);
        if (typeof rawGraphFilters === "string" && rawGraphFilters.length > 0) {
          try {
            var parsedGraphFilters = JSON.parse(rawGraphFilters);
            if (
              !isObject(parsedGraphFilters) ||
              !isValidGraphSource(parsedGraphFilters.source) ||
              !isValidGraphVisibility(parsedGraphFilters.visibility)
            ) {
              throw new Error("invalid graph filters");
            }
          } catch (_error) {
            local.removeItem(GRAPH_KEY);
            cleared.push(GRAPH_KEY);
          }
        }

        var rawAuditFilters = local.getItem(AUDIT_FILTERS_KEY);
        if (typeof rawAuditFilters === "string" && rawAuditFilters.length > 0) {
          try {
            var parsedAuditFilters = JSON.parse(rawAuditFilters);
            if (!isObject(parsedAuditFilters)) {
              throw new Error("invalid scheduler audit filters");
            }
            var nextAuditFilters = {
              lane: isValidAuditLane(parsedAuditFilters.lane)
                ? parsedAuditFilters.lane
                : "all",
              status: isValidAuditStatus(parsedAuditFilters.status)
                ? parsedAuditFilters.status
                : "all",
              window: isValidAuditWindow(parsedAuditFilters.window)
                ? parsedAuditFilters.window
                : "all",
            };
            if (
              nextAuditFilters.lane !== parsedAuditFilters.lane ||
              nextAuditFilters.status !== parsedAuditFilters.status ||
              nextAuditFilters.window !== parsedAuditFilters.window
            ) {
              local.setItem(AUDIT_FILTERS_KEY, JSON.stringify(nextAuditFilters));
              healed.push(AUDIT_FILTERS_KEY);
            }
          } catch (_error) {
            local.removeItem(AUDIT_FILTERS_KEY);
            cleared.push(AUDIT_FILTERS_KEY);
          }
        }

        var rawAuditViews = local.getItem(AUDIT_VIEWS_KEY);
        if (typeof rawAuditViews === "string" && rawAuditViews.length > 0) {
          try {
            var parsedAuditViews = JSON.parse(rawAuditViews);
            if (!Array.isArray(parsedAuditViews)) {
              throw new Error("invalid scheduler audit views");
            }
            var nextAuditViews = [];
            for (var i = 0; i < parsedAuditViews.length; i += 1) {
              var view = parsedAuditViews[i];
              if (!isObject(view)) continue;
              var name =
                typeof view.name === "string"
                  ? view.name.trim().replace(/\\s+/g, " ").slice(0, 32)
                  : "";
              var id = typeof view.id === "string" ? view.id.trim() : "";
              var filters = isObject(view.filters) ? view.filters : {};
              if (!id || !name) continue;
              nextAuditViews.push({
                id: id,
                name: name,
                filters: {
                  lane: isValidAuditLane(filters.lane) ? filters.lane : "all",
                  status: isValidAuditStatus(filters.status) ? filters.status : "all",
                  window: isValidAuditWindow(filters.window) ? filters.window : "all",
                },
              });
              if (nextAuditViews.length >= 6) break;
            }
            if (nextAuditViews.length !== parsedAuditViews.length) {
              local.setItem(AUDIT_VIEWS_KEY, JSON.stringify(nextAuditViews));
              healed.push(AUDIT_VIEWS_KEY);
            }
          } catch (_error) {
            local.removeItem(AUDIT_VIEWS_KEY);
            cleared.push(AUDIT_VIEWS_KEY);
          }
        }

        var rawSplitLock = local.getItem(SPLIT_LOCK_KEY);
        if (
          typeof rawSplitLock === "string" &&
          rawSplitLock.length > 0 &&
          rawSplitLock !== "0" &&
          rawSplitLock !== "1"
        ) {
          local.removeItem(SPLIT_LOCK_KEY);
          cleared.push(SPLIT_LOCK_KEY);
        }

        var rawClickDebug = local.getItem(CLICK_DEBUG_KEY);
        if (
          typeof rawClickDebug === "string" &&
          rawClickDebug.length > 0 &&
          rawClickDebug !== "0" &&
          rawClickDebug !== "1"
        ) {
          local.removeItem(CLICK_DEBUG_KEY);
          cleared.push(CLICK_DEBUG_KEY);
        }

        writeNotice();
      } catch (_error) {
        // Never let a boot-time state repair attempt break the shell.
      }
    })();
  `;
}
