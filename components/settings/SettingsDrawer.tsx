"use client";

import Link from "next/link";
import { memo, useState, useCallback, useEffect } from "react";
import { useStore, DEFAULT_SETTINGS, Settings } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import RuntimeEvalTrend from "@/components/ui/RuntimeEvalTrend";
import { PMHealthStrip } from "@/components/settings/PMHealthStrip";
import { PMChecklist } from "@/components/settings/PMChecklist";
import {
  AI_PROVIDER_BRANDING,
  BILLING_TIER_LABELS,
  BRAND_NAME,
} from "@/lib/brand";
import {
  getCloudInferenceBlockedMessage,
  getCloudInferenceStatusLabel,
  isCloudInferenceAllowedInMode,
  isCloudInferenceProvider,
} from "@/lib/aiCloudReadiness";
import {
  getVisibleAIProviderOptions,
  normalizePreferredAIProvider,
} from "@/lib/aiProviderPreference";
import {
  resolveInstalledOllamaModelFromCatalog,
} from "@/lib/ollamaModelResolver";
import { RELEASE_DEFAULTS } from "@/lib/releaseMatrix";

// ── Non-sensitive fields — stored in Zustand / localStorage ──────────────────
const LOCAL_FIELDS: {
  key: keyof Settings;
  label: string;
  type?: string;
  placeholder?: string;
  sessionOnly?: boolean;
  helperText?: string;
}[] = [
  {
    key: "aiProvider",
    label: "Preferred AI lane",
  },
  {
    key: "localEndpoint",
    label: "Local LLM Endpoint",
    placeholder: "http://localhost:11434/v1/...",
  },
  { key: "localModel", label: "Local Model Name", placeholder: "qwen3:8b" },
  {
    key: "localApiKey",
    label: "Local / OpenRouter Key",
    type: "password",
    sessionOnly: true,
    helperText:
      "Stored in memory only for safety. It will clear on browser reload.",
  },
  { key: "userName", label: "Your Name" },
  { key: "userGoals", label: "Goals", placeholder: "SaaS, $4K/mo, freelance…" },
  { key: "userSkills", label: "Skills", placeholder: "Python, copywriting…" },
  { key: "userLearning", label: "Currently Learning" },
  { key: "userContext", label: "Extra Context for AI" },
  { key: "alertKeywords", label: "Alert Keywords (comma-separated)" },
];

// ── Sensitive fields shown in the drawer ─────────────────────────────────────
const SENSITIVE_FIELDS: {
  label: string;
  envKey: string;
  placeholder?: string;
}[] = [
  {
    label: "Claude / Anthropic API Key",
    envKey: "ANTHROPIC_API_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  {
    label: "OpenAI API Key",
    envKey: "OPENAI_API_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  {
    label: "Groq API Key",
    envKey: "GROQ_API_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  {
    label: "Google AI Key",
    envKey: "GOOGLE_AI_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  {
    label: "OpenRouter API Key",
    envKey: "OPENROUTER_API_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  {
    label: "MiniMax API Key",
    envKey: "MINIMAX_API_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  {
    label: "Brave Search API Key",
    envKey: "BRAVE_SEARCH_KEY",
    placeholder: "<set-in-local-env-only>",
  },
  { label: "CoinGecko Demo Key", envKey: "COINGECKO_KEY" },
  { label: "Finnhub Key", envKey: "FINNHUB_KEY" },
  { label: "NVD API Key", envKey: "NVD_KEY" },
  { label: "Guardian API Key", envKey: "GUARDIAN_KEY" },
  { label: "FRED API Key", envKey: "FRED_KEY" },
  { label: "AlienVault OTX Key", envKey: "OTX_KEY" },
  { label: "AISStream Key", envKey: "AISSTREAM_KEY" },
  { label: "NASA FIRMS Key", envKey: "FIRMS_MAP_KEY" },
  { label: "Firecrawl Key", envKey: "FIRECRAWL_KEY" },
  { label: "Have I Been Pwned Key", envKey: "HIBP_API_KEY" },
  { label: "VirusTotal Key", envKey: "VT_API_KEY" },
  { label: "Shodan Key", envKey: "SHODAN_API_KEY" },
];

type SecurityConfig = {
  NEXUS_NETWORK_MODE: "isolated" | "internal" | "connected";
  NEXUS_ENABLE_HIGH_RISK_TOOLS: "true" | "false";
  NEXUS_ALLOW_PAID_APIS: "true" | "false";
  NEXUS_CONNECTOR_POLICY_JSON: string;
  NEXUS_DEPLOYMENT_PROFILE: "local-dev" | "web-self-hosted" | "desktop-secure";
};

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  NEXUS_NETWORK_MODE:
    process.env.NODE_ENV === "development" ? "internal" : "isolated",
  NEXUS_ENABLE_HIGH_RISK_TOOLS: "false",
  NEXUS_ALLOW_PAID_APIS: "false",
  NEXUS_CONNECTOR_POLICY_JSON: "",
  NEXUS_DEPLOYMENT_PROFILE: "local-dev",
};

function coerceSecurityConfig(config?: Partial<SecurityConfig>): SecurityConfig {
  return {
    NEXUS_NETWORK_MODE:
      config?.NEXUS_NETWORK_MODE === "internal" ||
      config?.NEXUS_NETWORK_MODE === "connected"
        ? config.NEXUS_NETWORK_MODE
        : DEFAULT_SECURITY_CONFIG.NEXUS_NETWORK_MODE,
    NEXUS_ENABLE_HIGH_RISK_TOOLS:
      config?.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true" ? "true" : "false",
    NEXUS_ALLOW_PAID_APIS:
      config?.NEXUS_ALLOW_PAID_APIS === "true" ? "true" : "false",
    NEXUS_CONNECTOR_POLICY_JSON:
      typeof config?.NEXUS_CONNECTOR_POLICY_JSON === "string"
        ? config.NEXUS_CONNECTOR_POLICY_JSON
        : config?.NEXUS_CONNECTOR_POLICY_JSON
          ? JSON.stringify(config.NEXUS_CONNECTOR_POLICY_JSON)
          : "",
    NEXUS_DEPLOYMENT_PROFILE:
      config?.NEXUS_DEPLOYMENT_PROFILE === "web-self-hosted" ||
      config?.NEXUS_DEPLOYMENT_PROFILE === "desktop-secure"
        ? config.NEXUS_DEPLOYMENT_PROFILE
        : "local-dev",
  };
}

function getChangedSecurityConfig(
  current: SecurityConfig,
  baseline: SecurityConfig,
): Partial<SecurityConfig> {
  const changed: Partial<SecurityConfig> = {};
  (Object.keys(current) as Array<keyof SecurityConfig>).forEach((key) => {
    if (current[key] !== baseline[key]) {
      Object.assign(changed, { [key]: current[key] });
    }
  });
  return changed;
}

type ReleaseInfo = {
  buildChannel: string;
  buildVersion: string;
  supportedSurfacePolicy: string;
  canonicalDeploymentLane: string;
  defaultEntrypoint: string;
  uiShellVersion: string;
  surfaces: {
    total: number;
    ga: number;
    beta: number;
    internal: number;
    gaNav: number;
  };
};

type OllamaRuntimeStatus = {
  checking: boolean;
  reachable: boolean;
  models: string[];
  activeModel: string | null;
  suggestedModel: string | null;
};

type SettingsSnapshotPayload = {
  status?: Record<string, boolean>;
  config?: Partial<SecurityConfig> & {
    NEXUS_CONNECTOR_POLICY_JSON?: unknown;
  };
  release?: ReleaseInfo | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

// Wrapped in memo — settings rarely change so this prevents unnecessary re-renders
// triggered by unrelated store writes (e.g. price updates every 60s).
const SettingsDrawer = memo(function SettingsDrawer({ open, onClose }: Props) {
  // Narrow selector: subscribes only to the settings slice, not the full store.
  // Zustand will only re-render this component when `settings` itself changes.
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  // Track local edits to sensitive fields before save (never stored in Zustand)
  const [sensitiveEdits, setSensitiveEdits] = useState<Record<string, string>>(
    {},
  );
  // Server-side key status from GET /api/settings
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(
    DEFAULT_SECURITY_CONFIG,
  );
  const [initialSecurityConfig, setInitialSecurityConfig] =
    useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [ollamaRuntime, setOllamaRuntime] = useState<OllamaRuntimeStatus>({
    checking: false,
    reachable: false,
    models: [],
    activeModel: null,
    suggestedModel: null,
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const primaryProviders = AI_PROVIDER_BRANDING.filter(
    (provider) => provider.surface === "primary",
  );
  const advancedProviders = AI_PROVIDER_BRANDING.filter(
    (provider) => provider.surface === "advanced",
  );
  const allowAdvancedProviders = securityConfig.NEXUS_ALLOW_PAID_APIS === "true";
  const hasPendingSecurityConfigChanges =
    Object.keys(
      getChangedSecurityConfig(securityConfig, initialSecurityConfig),
    ).length > 0;
  const pendingNetworkModeSave =
    securityConfig.NEXUS_NETWORK_MODE !== initialSecurityConfig.NEXUS_NETWORK_MODE;
  const effectiveNetworkMode = pendingNetworkModeSave
    ? initialSecurityConfig.NEXUS_NETWORK_MODE
    : securityConfig.NEXUS_NETWORK_MODE;
  const cloudInferenceEnabled = isCloudInferenceAllowedInMode(
    effectiveNetworkMode,
  );
  const visibleProviderIds = getVisibleAIProviderOptions(allowAdvancedProviders);
  const visiblePreferredProviders = AI_PROVIDER_BRANDING.filter((provider) =>
    visibleProviderIds.includes(provider.id as (typeof visibleProviderIds)[number]),
  );
  const selectedPreferredProvider = normalizePreferredAIProvider(
    settings.aiProvider,
    {
      allowAdvanced: allowAdvancedProviders,
    },
  );
  const blockedConfiguredCloudProviders = primaryProviders.filter((provider) => {
    if (!isCloudInferenceProvider(provider.id) || !provider.envKey) return false;
    return keyStatus[provider.envKey] === true && !cloudInferenceEnabled;
  });
  const preferredCloudProviderBlocked =
    isCloudInferenceProvider(selectedPreferredProvider) && !cloudInferenceEnabled;
  const hydrateServerSettings = useCallback((data: SettingsSnapshotPayload) => {
    if (data?.status) setKeyStatus(data.status);
    if (data?.config) {
      const nextSecurityConfig = coerceSecurityConfig({
        ...data.config,
        NEXUS_CONNECTOR_POLICY_JSON: data.config.NEXUS_CONNECTOR_POLICY_JSON
          ? JSON.stringify(data.config.NEXUS_CONNECTOR_POLICY_JSON, null, 0)
          : "",
      });
      setSecurityConfig(nextSecurityConfig);
      setInitialSecurityConfig(nextSecurityConfig);
    }
    if (data?.release) setReleaseInfo(data.release);
  }, []);
  const loadServerSettings = useCallback(async () => {
    try {
      const response = await apiFetch("/api/settings");
      const data = await response.json();
      hydrateServerSettings(data);
    } catch {
      /* non-fatal */
    }
  }, [hydrateServerSettings]);

  // Load the current server-side settings snapshot whenever the drawer opens.
  useEffect(() => {
    if (!open) return;
    void loadServerSettings();
  }, [loadServerSettings, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setOllamaRuntime((prev) => ({ ...prev, checking: true }));
    void apiFetch("/api/ollama/catalog", {
      method: "POST",
      body: JSON.stringify({
        endpoint: settings.localEndpoint,
        apiKey: settings.localApiKey,
      }),
    })
      .then((r) => r.json())
      .then((catalog) => {
        if (!active) return;
        const models = Array.isArray(catalog?.models) ? catalog.models : [];
        const activeModels = Array.isArray(catalog?.activeModels)
          ? catalog.activeModels
          : [];
        const activeModel =
          typeof catalog?.activeModel === "string" && catalog.activeModel.trim().length > 0
            ? catalog.activeModel.trim()
            : null;
        const resolution = catalog?.reachable
          ? resolveInstalledOllamaModelFromCatalog({
              requestedModel: settings.localModel,
              task: "default",
              models,
              activeModels,
              preferActiveModel: true,
            })
          : null;
        setOllamaRuntime({
          checking: false,
          reachable: catalog?.reachable === true,
          models: models.map((model: { name?: string }) => String(model.name ?? "")),
          activeModel,
          suggestedModel: resolution?.resolvedModel ?? null,
        });
      })
      .catch(() => {
        if (!active) return;
        setOllamaRuntime({
          checking: false,
          reachable: false,
          models: [],
          activeModel: null,
          suggestedModel: null,
        });
      });
    return () => {
      active = false;
    };
  }, [open, settings.localApiKey, settings.localEndpoint, settings.localModel]);

  useEffect(() => {
    const normalized = normalizePreferredAIProvider(settings.aiProvider, {
      allowAdvanced: allowAdvancedProviders,
    });
    if (normalized !== settings.aiProvider) {
      updateSettings({ aiProvider: normalized } as Partial<Settings>);
    }
  }, [allowAdvancedProviders, settings.aiProvider, updateSettings]);

  const save = useCallback(async (overrideSecurityConfig?: SecurityConfig) => {
    setSaving(true);
    setSaveErr("");
    const securityToPersist = overrideSecurityConfig ?? securityConfig;
    if (overrideSecurityConfig) {
      setSecurityConfig(overrideSecurityConfig);
    }

    // POST sensitive keys to server if any were edited
    const changedSecurityConfig = getChangedSecurityConfig(
      securityToPersist,
      initialSecurityConfig,
    );
    const serverPayload = { ...sensitiveEdits, ...changedSecurityConfig };
    const hasServerUpdates = Object.keys(serverPayload).length > 0;
    if (hasServerUpdates) {
      try {
        const r = await apiFetch("/api/settings", {
          method: "POST",
          body: JSON.stringify(serverPayload),
        });
        const d = await r.json();
        if (!d.ok) {
          setSaveErr(d.error ?? "Failed to save API keys.");
          setSaving(false);
          return;
        }
        if (d.needsRestart) {
          setSaveErr("Keys saved. Restart the dev server to apply them.");
        }
        void loadServerSettings();
        // Clear the in-memory edits
        setSensitiveEdits({});
        setInitialSecurityConfig(securityToPersist);
      } catch {
        setSaveErr("Could not reach the server. Is Next.js running?");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }, [initialSecurityConfig, loadServerSettings, securityConfig, sensitiveEdits]);

  const handleSaveClick = useCallback(() => {
    void save();
  }, [save]);

  const enableCloudChatMode = useCallback(() => {
    void save({
      ...securityConfig,
      NEXUS_NETWORK_MODE: "internal",
    });
  }, [save, securityConfig]);

  const useDetectedLocalModel = useCallback(() => {
    if (!ollamaRuntime.suggestedModel) return;
    updateSettings({
      localModel: ollamaRuntime.suggestedModel,
    } as Partial<Settings>);
  }, [ollamaRuntime.suggestedModel, updateSettings]);

  const reset = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
    setSensitiveEdits({});
    setSecurityConfig(initialSecurityConfig);
    setSaveErr("");
  }, [initialSecurityConfig, updateSettings]);

  // ── Exit animation ───────────────────────────────────────────────────────────
  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose, open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="nexus-overlay-backdrop"
        onClick={handleClose}
        aria-hidden="true"
        style={{
          opacity: closing ? 0 : 1,
          transition: "opacity .22s var(--t, ease)",
        }}
      />

      {/* Drawer */}
      <div
        className="nexus-sidepanel nexus-sidepanel--settings"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        id="nexus-settings-dialog"
        data-testid="settings-dialog"
        style={{
          width: "min(440px, 100vw)",
          transform: closing ? "translateX(100%)" : "translateX(0)",
          transition: "transform .22s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Header */}
        <div className="nexus-sidepanel__header">
          <div className="nexus-sidepanel__header-copy">
            <span className="nexus-sidepanel__eyebrow">Control surface</span>
            <span className="nexus-sidepanel__title">Settings</span>
            <span className="nexus-sidepanel__subtitle">
              {BRAND_NAME} preferences, provider posture, and deployment policy in one place.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="nexus-sidepanel__close"
            data-testid="settings-close"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="nexus-sidepanel__body">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
          <div
            style={{
              padding: "12px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              background:
                "linear-gradient(180deg, rgba(103,232,249,0.08) 0%, rgba(8,18,26,0.78) 100%)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "8px",
              }}
            >
              Provider posture
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55, marginBottom: 12 }}>
              {BRAND_NAME} keeps the primary operator lane free-first. Local and free-tier providers stay in the main path; paid-compatible lanes remain advanced and hidden unless you opt in.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {[...primaryProviders, ...advancedProviders].map((provider) => {
                const configured = provider.envKey ? keyStatus[provider.envKey] === true : true;
                const advancedLocked =
                  provider.surface === "advanced" &&
                  securityConfig.NEXUS_ALLOW_PAID_APIS !== "true";
                const enabledByPolicy = isCloudInferenceProvider(provider.id)
                  ? cloudInferenceEnabled
                  : !advancedLocked;
                const statusLabel = getCloudInferenceStatusLabel({
                  configured,
                  enabledByPolicy,
                  hiddenByPolicy: advancedLocked,
                });
                return (
                  <div
                    key={provider.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(125,211,252,0.14)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                        {provider.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.45 }}>
                        {provider.description}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {BILLING_TIER_LABELS[provider.billingTier]}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: advancedLocked
                          ? "var(--text3)"
                          : statusLabel === "blocked by mode"
                            ? "var(--fmd)"
                            : configured
                            ? "var(--fhi)"
                            : "var(--fmd)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel}
                    </div>
                  </div>
                );
              })}
            </div>
            {(blockedConfiguredCloudProviders.length > 0 ||
              preferredCloudProviderBlocked) && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  background: "rgba(245, 158, 11, 0.08)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--fmd)",
                  }}
                >
                  Cloud chat is blocked by the current network mode
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text2)",
                    lineHeight: 1.55,
                  }}
                >
                  {pendingNetworkModeSave
                    ? `Network Mode is changed in this drawer, but the saved server policy is still ${initialSecurityConfig.NEXUS_NETWORK_MODE}. Save the server change below so cloud chat can use the new mode immediately.`
                    : getCloudInferenceBlockedMessage({
                        mode: securityConfig.NEXUS_NETWORK_MODE,
                        providerLabel:
                          blockedConfiguredCloudProviders[0]?.label ??
                          visiblePreferredProviders.find(
                            (provider) => provider.id === selectedPreferredProvider,
                          )?.label ??
                          "Cloud AI",
                      })}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pendingNetworkModeSave ? (
                    <button
                      type="button"
                      onClick={handleSaveClick}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(125,211,252,0.24)",
                        background: "rgba(103,232,249,0.12)",
                        color: "var(--accent)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Save server mode now
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={enableCloudChatMode}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(125,211,252,0.24)",
                        background: "rgba(103,232,249,0.12)",
                        color: "var(--accent)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Use internal mode for cloud chat
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text3)",
                      alignSelf: "center",
                    }}
                  >
                    Saves immediately and keeps high-risk action routes separate.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Server-Side API Keys section ── */}
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🔒 API Keys
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  fontWeight: 400,
                  textTransform: "none",
                }}
              >
                — stored server-side in .env.local, never in the browser session
              </span>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {SENSITIVE_FIELDS.map(({ label, envKey, placeholder }) => {
                const isSet = keyStatus[envKey] === true;
                return (
                  <label
                    key={envKey}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--text3)",
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {label}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: isSet ? "var(--fhi)" : "var(--text3)",
                        }}
                      >
                        {isSet ? "● set" : "○ not set"}
                      </span>
                    </span>
                    <input
                      type="password"
                      value={sensitiveEdits[envKey] ?? ""}
                      placeholder={
                        isSet
                          ? "••••••••••••• (already set)"
                          : (placeholder ?? "Paste key…")
                      }
                      onChange={(e) =>
                        setSensitiveEdits((prev) => ({
                          ...prev,
                          [envKey]: e.target.value,
                        }))
                      }
                      style={{
                        background: "var(--surf2)",
                        border: "1px solid var(--border2)",
                        borderRadius: "6px",
                        color: "var(--text)",
                        fontSize: "12px",
                        padding: "7px 10px",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                        fontFamily: "monospace",
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Security profile / route policy controls ── */}
          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surf2)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              Security Profile (server)
            </div>

            <label
              style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                }}
              >
                Network Mode
                {hasPendingSecurityConfigChanges ? (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "10px",
                      color: "var(--fmd)",
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    unsaved server change
                  </span>
                ) : null}
              </span>
              <select
                value={securityConfig.NEXUS_NETWORK_MODE}
                onChange={(e) =>
                  setSecurityConfig((prev) => ({
                    ...prev,
                    NEXUS_NETWORK_MODE: e.target.value as SecurityConfig["NEXUS_NETWORK_MODE"],
                  }))
                }
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--border2)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "12px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <option value="isolated">isolated (default safe)</option>
                <option value="internal">internal</option>
                <option value="connected">connected</option>
              </select>
            </label>

            <label
              style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                }}
              >
                Deployment Profile
              </span>
              <select
                value={securityConfig.NEXUS_DEPLOYMENT_PROFILE}
                onChange={(e) =>
                  setSecurityConfig((prev) => ({
                    ...prev,
                    NEXUS_DEPLOYMENT_PROFILE:
                      e.target.value as SecurityConfig["NEXUS_DEPLOYMENT_PROFILE"],
                  }))
                }
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--border2)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "12px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <option value="local-dev">local-dev</option>
                <option value="web-self-hosted">web-self-hosted</option>
                <option value="desktop-secure">desktop-secure</option>
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={securityConfig.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true"}
                onChange={(e) =>
                  setSecurityConfig((prev) => ({
                    ...prev,
                    NEXUS_ENABLE_HIGH_RISK_TOOLS: e.target.checked ? "true" : "false",
                  }))
                }
              />
              <span style={{ fontSize: 12, color: "var(--text)" }}>
                Enable high-risk API routes
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={securityConfig.NEXUS_ALLOW_PAID_APIS === "true"}
                onChange={(e) =>
                  setSecurityConfig((prev) => ({
                    ...prev,
                    NEXUS_ALLOW_PAID_APIS: e.target.checked ? "true" : "false",
                  }))
                }
              />
              <span style={{ fontSize: 12, color: "var(--text)" }}>
                Unlock advanced paid-compatible AI lanes
              </span>
            </label>

            <label
              style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                }}
              >
                Connector Policy JSON (optional overrides)
              </span>
              <textarea
                value={securityConfig.NEXUS_CONNECTOR_POLICY_JSON}
                onChange={(e) =>
                  setSecurityConfig((prev) => ({
                    ...prev,
                    NEXUS_CONNECTOR_POLICY_JSON: e.target.value,
                  }))
                }
                rows={4}
                placeholder='{"news":true,"flights":false}'
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--border2)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "12px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
            </label>

            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border2)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                }}
              >
                Release Scope
              </span>
              <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.45 }}>
                Supported surface policy: {releaseInfo?.supportedSurfacePolicy ?? RELEASE_DEFAULTS.supportedSurfacePolicy}. Canonical deployment lane: {releaseInfo?.canonicalDeploymentLane ?? RELEASE_DEFAULTS.canonicalDeploymentLane}.
              </span>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>
                GA nav tabs: {releaseInfo?.surfaces.gaNav ?? 7}. Beta surfaces: {releaseInfo?.surfaces.beta ?? 0}. Internal surfaces: {releaseInfo?.surfaces.internal ?? 0}.
              </span>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>
                Default entrypoint: {releaseInfo?.defaultEntrypoint ?? RELEASE_DEFAULTS.defaultEntrypoint}. Shell version: {releaseInfo?.uiShellVersion ?? RELEASE_DEFAULTS.uiShellVersion}.
              </span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                Build: {releaseInfo?.buildChannel ?? "dev"} / {releaseInfo?.buildVersion ?? "local-dev"}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surf2)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              Release Preferences (local)
            </div>

            <label
              style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                }}
              >
                Preferred deployment lane
              </span>
              <select
                value={settings.deploymentLanePreference}
                onChange={(e) =>
                  updateSettings({
                    deploymentLanePreference:
                      e.target.value as Settings["deploymentLanePreference"],
                  })
                }
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--border2)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "12px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <option value="webFirst">webFirst</option>
                <option value="dualTrack">dualTrack</option>
                <option value="desktopFirst">desktopFirst</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                }}
              >
                Surface visibility preference
              </span>
              <select
                value={settings.surfaceVisibilityPreference}
                onChange={(e) =>
                  updateSettings({
                    surfaceVisibilityPreference:
                      e.target.value as Settings["surfaceVisibilityPreference"],
                  })
                }
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--border2)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "12px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <option value="gaOnly">gaOnly</option>
                <option value="includeBeta">includeBeta</option>
              </select>
            </label>
          </div>

          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surf2)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "10px",
              }}
            >
              Local Ollama Runtime
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
                {ollamaRuntime.checking
                  ? "Checking the local Ollama runtime..."
                  : ollamaRuntime.reachable
                    ? `Ollama is reachable. Detected ${ollamaRuntime.models.length} installed model${ollamaRuntime.models.length === 1 ? "" : "s"}.`
                    : "Ollama is not reachable at the saved local endpoint right now."}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
                Saved local model:{" "}
                <span style={{ color: "var(--text)", fontFamily: "monospace" }}>
                  {settings.localModel || "unset"}
                </span>
              </div>
              {ollamaRuntime.activeModel ? (
                <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
                  Active running model:{" "}
                  <span style={{ color: "var(--text)", fontFamily: "monospace" }}>
                    {ollamaRuntime.activeModel}
                  </span>
                </div>
              ) : null}
              {ollamaRuntime.models.length > 0 ? (
                <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
                  Detected models:{" "}
                  <span style={{ color: "var(--text2)" }}>
                    {ollamaRuntime.models.slice(0, 4).join(", ")}
                    {ollamaRuntime.models.length > 4
                      ? ` +${ollamaRuntime.models.length - 4} more`
                      : ""}
                  </span>
                </div>
              ) : null}
              {ollamaRuntime.reachable &&
              ollamaRuntime.suggestedModel &&
              ollamaRuntime.suggestedModel !== settings.localModel ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    background: "rgba(245, 158, 11, 0.08)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.55 }}>
                    {ollamaRuntime.activeModel &&
                    ollamaRuntime.suggestedModel === ollamaRuntime.activeModel
                      ? "Ollama is already running a different active model. Nexus can follow it and use "
                      : "The saved local model is not the strongest detected installed match for this runtime. Nexus can switch to "}
                    <span style={{ color: "var(--text)", fontFamily: "monospace" }}>
                      {ollamaRuntime.suggestedModel}
                    </span>
                    .
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={useDetectedLocalModel}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(125,211,252,0.24)",
                        background: "rgba(103,232,249,0.12)",
                        color: "var(--accent)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Use detected model
                    </button>
                    <span style={{ fontSize: 10, color: "var(--text3)", alignSelf: "center" }}>
                      Chat will also self-heal this automatically on the next retry.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Local settings section ── */}
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              App Settings
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {LOCAL_FIELDS.map(
                ({ key, label, type, placeholder, sessionOnly, helperText }) => {
                const val = settings[key];
                if (Array.isArray(val) || typeof val === "object") return null;
                if (key === "aiProvider") {
                  const selectedProvider = normalizePreferredAIProvider(val, {
                    allowAdvanced: allowAdvancedProviders,
                  });
                  return (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--text3)",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </span>
                      <select
                        value={selectedProvider}
                        onChange={(e) =>
                          updateSettings({
                            aiProvider: normalizePreferredAIProvider(
                              e.target.value,
                              { allowAdvanced: allowAdvancedProviders },
                            ),
                          } as Partial<Settings>)
                        }
                        style={{
                          background: "var(--surf2)",
                          border: "1px solid var(--border2)",
                          borderRadius: "6px",
                          color: "var(--text)",
                          fontSize: "12px",
                          padding: "7px 10px",
                          outline: "none",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        {visiblePreferredProviders.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.label}
                            {provider.recommended ? " (recommended)" : ""}
                          </option>
                        ))}
                      </select>
                      {isCloudInferenceProvider(selectedProvider) &&
                      !cloudInferenceEnabled ? (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--fmd)",
                            lineHeight: 1.45,
                          }}
                        >
                          {pendingNetworkModeSave
                            ? `The selected cloud lane is still blocked because the saved server mode is ${initialSecurityConfig.NEXUS_NETWORK_MODE}. Save the Network Mode change to use it.`
                            : "The selected cloud lane is currently blocked by isolated mode. Switch Network Mode to internal or connected to use it."}
                        </span>
                      ) : null}
                    </label>
                  );
                }
                return (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--text3)",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {label}
                        {sessionOnly ? (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 600,
                              color: "var(--fmd)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            session only
                          </span>
                        ) : null}
                      </span>
                      <input
                      type={type ?? "text"}
                      value={String(val ?? "")}
                      placeholder={placeholder}
                      onChange={(e) =>
                        updateSettings({
                          [key]: e.target.value,
                        } as Partial<Settings>)
                      }
                      style={{
                        background: "var(--surf2)",
                        border: "1px solid var(--border2)",
                        borderRadius: "6px",
                        color: "var(--text)",
                        fontSize: "12px",
                        padding: "7px 10px",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                        }}
                      />
                      {helperText ? (
                        <span
                          style={{
                            fontSize: "10px",
                            color: sessionOnly ? "var(--fmd)" : "var(--text3)",
                            lineHeight: 1.45,
                          }}
                        >
                          {helperText}
                        </span>
                      ) : null}
                    </label>
                  );
                },
              )}
            </div>

            {/* Operational profiles: auto-jobs controls */}
            <div
              style={{
                marginTop: 14,
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surf2)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: 10,
                }}
              >
                Operational Auto Jobs
              </div>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                  }}
                >
                  Surface Motion Profile
                </span>
                <select
                  value={String(settings.surfaceMotionProfile ?? "flagship")}
                  onChange={(e) =>
                    updateSettings({
                      surfaceMotionProfile: e.target.value as
                        | "reduced"
                        | "standard"
                        | "flagship",
                    } as Partial<Settings>)
                  }
                  style={{
                    background: "var(--surf)",
                    border: "1px solid var(--border2)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "12px",
                    padding: "7px 10px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="reduced">Reduced</option>
                  <option value="standard">Standard</option>
                  <option value="flagship">Flagship</option>
                </select>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    lineHeight: 1.45,
                  }}
                >
                  Sets the site-wide motion posture. HQ scene effects follow this master profile before their own quality setting.
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                  }}
                >
                  Office VFX Quality
                </span>
                <select
                  value={String(settings.officeVfxQuality ?? "low")}
                  onChange={(e) =>
                    updateSettings({
                      officeVfxQuality: e.target.value as any,
                    } as Partial<Settings>)
                  }
                  style={{
                    background: "var(--surf)",
                    border: "1px solid var(--border2)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "12px",
                    padding: "7px 10px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="off">Off</option>
                  <option value="low">Low (recommended)</option>
                  <option value="high">High</option>
                </select>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    lineHeight: 1.45,
                  }}
                >
                  HQ-only override for the 3D room. Reduced motion can still clamp this lower when accessibility or site posture requires it.
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(settings.enableWarAutoJobs)}
                  onChange={(e) =>
                    updateSettings({
                      enableWarAutoJobs: e.target.checked,
                    } as Partial<Settings>)
                  }
                />
                <span style={{ fontSize: 12, color: "var(--text)" }}>
                  Enable War Room auto jobs
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(settings.enableNightOpsAutoJobs)}
                  onChange={(e) =>
                    updateSettings({
                      enableNightOpsAutoJobs: e.target.checked,
                    } as Partial<Settings>)
                  }
                />
                <span style={{ fontSize: 12, color: "var(--text)" }}>
                  Enable Night Ops auto jobs
                </span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(settings.agentHighRiskWritesRequireApproval)}
                  onChange={(e) =>
                    updateSettings({
                      agentHighRiskWritesRequireApproval: e.target.checked,
                    } as Partial<Settings>)
                  }
                />
                <span style={{ fontSize: 12, color: "var(--text)" }}>
                  Require approval for high-risk write tools
                </span>
              </label>

              <label
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                  }}
                >
                  Global Auto Job Cooldown (minutes)
                </span>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={Number(settings.autoOpsJobCooldownMin ?? 30)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const safe = Number.isFinite(n)
                      ? Math.max(10, Math.min(180, n))
                      : 30;
                    updateSettings({
                      autoOpsJobCooldownMin: safe,
                    } as Partial<Settings>);
                  }}
                  style={{
                    background: "var(--surf)",
                    border: "1px solid var(--border2)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "12px",
                    padding: "7px 10px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </label>
            </div>

            {/* Notifications & Debug toggles */}
            <div
              style={{
                marginTop: 14,
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surf2)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: 10,
                }}
              >
                Notifications &amp; Debug
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.doNotDisturb)}
                  onChange={(e) =>
                    updateSettings({ doNotDisturb: e.target.checked } as Partial<Settings>)
                  }
                />
                <span style={{ fontSize: 12, color: "var(--text)" }}>
                  Do Not Disturb — suppress toast notifications
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.agentDebugMode)}
                  onChange={(e) =>
                    updateSettings({ agentDebugMode: e.target.checked } as Partial<Settings>)
                  }
                />
                <span style={{ fontSize: 12, color: "var(--text)" }}>
                  Agent debug mode — show routing scores in HQ chat input
                </span>
              </label>
            </div>

            <PMHealthStrip />
            <PMChecklist />
            <RuntimeEvalTrend />
          </div>
        </div>
        </div>

        {/* Footer */}
        <div className="nexus-sidepanel__footer">
          <Link
            href="/resources"
            onClick={onClose}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--accent)",
              textDecoration: "none",
              marginBottom: "2px",
            }}
          >
            📚 Field manual — certification, interviews, agent resources →
          </Link>
          {saveErr && (
            <div
              style={{
                fontSize: "11px",
                color: saveErr.includes("Restart")
                  ? "var(--fmd)"
                  : "var(--flo)",
                lineHeight: 1.4,
              }}
            >
              {saveErr}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saving}
              style={{
                flex: 1,
                height: "34px",
                borderRadius: "7px",
                background: saving ? "var(--border2)" : "var(--accent)",
                border: "none",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saved ? "✓ Saved" : saving ? "Saving…" : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={reset}
              style={{
                height: "34px",
                padding: "0 14px",
                borderRadius: "7px",
                background: "transparent",
                border: "1px solid var(--border2)",
                color: "var(--text2)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default SettingsDrawer;
