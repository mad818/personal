"use client";

import Link from "next/link";
import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useStore, DEFAULT_SETTINGS, Settings } from "@/store/useStore";
import { apiFetch } from "@/lib/apiFetch";
import {
  loadSettingsServerSnapshot,
  type SettingsServerLoadState,
} from "@/lib/settingsServerStatus";
import RuntimeEvalTrend from "@/components/ui/RuntimeEvalTrend";
import { PMHealthStrip } from "@/components/settings/PMHealthStrip";
import { PMChecklist } from "@/components/settings/PMChecklist";
import {
  AI_PROVIDER_BRANDING,
  BILLING_TIER_LABELS,
  BRAND_NAME,
} from "@/lib/brand";
import { RELEASE_DEFAULTS } from "@/lib/releaseMatrix";
import { compilePersonalAIProfile } from "@/lib/personalAIProfile";
import { useModalDialog } from "@/hooks/useModalDialog";

// ── Non-sensitive fields — stored in Zustand / localStorage ──────────────────
const LOCAL_FIELDS: {
  key: keyof Settings;
  label: string;
  type?: string;
  placeholder?: string;
}[] = [
  {
    key: "aiProvider",
    label:
      "Preferred AI lane (ollama | groq | google | anthropic | azure | openai | minimax)",
  },
  {
    key: "localEndpoint",
    label: "Local LLM Endpoint",
    placeholder: "http://localhost:11434/v1/...",
  },
  { key: "localApiKey", label: "Local / OpenRouter Key", type: "password" },
  { key: "userName", label: "Your Name" },
  { key: "userGoals", label: "Goals", placeholder: "SaaS, $4K/mo, freelance…" },
  { key: "userSkills", label: "Skills", placeholder: "Python, copywriting…" },
  { key: "userLearning", label: "Currently Learning" },
  { key: "userContext", label: "Extra Context for AI" },
  { key: "alertKeywords", label: "Alert Keywords (comma-separated)" },
];

// ── Sensitive fields shown in the drawer ─────────────────────────────────────
const SENSITIVE_FIELDS: {
  key: string;
  label: string;
  envKey: string;
  placeholder?: string;
}[] = [
  {
    key: "anthropicKey",
    label: "Claude / Anthropic API Key",
    envKey: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-...",
  },
  {
    key: "openaiKey",
    label: "OpenAI API Key",
    envKey: "OPENAI_API_KEY",
    placeholder: "sk-...",
  },
  {
    key: "azureOpenAiKey",
    label: "Azure OpenAI API Key",
    envKey: "AZURE_OPENAI_API_KEY",
    placeholder: "Stored in the Azure resource",
  },
  {
    key: "groqKey",
    label: "Groq API Key",
    envKey: "GROQ_API_KEY",
    placeholder: "gsk_...",
  },
  {
    key: "googleAiKey",
    label: "Google AI Key",
    envKey: "GOOGLE_AI_KEY",
    placeholder: "AIza...",
  },
  {
    key: "openrouterKey",
    label: "OpenRouter API Key",
    envKey: "OPENROUTER_API_KEY",
    placeholder: "sk-or-...",
  },
  {
    key: "minimaxKey",
    label: "MiniMax API Key",
    envKey: "MINIMAX_API_KEY",
    placeholder: "platform.minimax.io",
  },
  {
    key: "braveKey",
    label: "Brave Search API Key",
    envKey: "BRAVE_SEARCH_KEY",
    placeholder: "Get free at search.brave.com",
  },
  { key: "cgKey", label: "CoinGecko Demo Key", envKey: "COINGECKO_KEY" },
  { key: "finnhubKey", label: "Finnhub Key", envKey: "FINNHUB_KEY" },
  { key: "nvdKey", label: "NVD API Key", envKey: "NVD_KEY" },
  { key: "guardianKey", label: "Guardian API Key", envKey: "GUARDIAN_KEY" },
  { key: "fredKey", label: "FRED API Key", envKey: "FRED_KEY" },
  { key: "otxKey", label: "AlienVault OTX Key", envKey: "OTX_KEY" },
  { key: "aisstreamKey", label: "AISStream Key", envKey: "AISSTREAM_KEY" },
  { key: "firmsKey", label: "NASA FIRMS Key", envKey: "FIRMS_MAP_KEY" },
  { key: "firecrawlKey", label: "Firecrawl Key", envKey: "FIRECRAWL_KEY" },
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

function coerceSecurityConfig(
  config?: Partial<SecurityConfig>,
): SecurityConfig {
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
  const personalAIProfile = compilePersonalAIProfile(settings);

  // Track local edits to sensitive fields before save (never stored in Zustand)
  const [sensitiveEdits, setSensitiveEdits] = useState<Record<string, string>>(
    {},
  );
  // Server-side key status from GET /api/settings
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const [serverSettingsStatus, setServerSettingsStatus] =
    useState<SettingsServerLoadState>("idle");
  const serverSettingsRequestRef = useRef(0);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(
    DEFAULT_SECURITY_CONFIG,
  );
  const [initialSecurityConfig, setInitialSecurityConfig] =
    useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);

  const [advancedConfirmed, setAdvancedConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [ollamaCatalog, setOllamaCatalog] = useState<{
    reachable: boolean;
    models: { name: string }[];
    resolvedModel: string | null;
    resolutionReason: string;
    requestedModel: string;
  } | null>(null);
  const [ollamaCatalogLoading, setOllamaCatalogLoading] = useState(false);
  const primaryProviders = AI_PROVIDER_BRANDING.filter(
    (provider) => provider.surface === "primary",
  );
  const advancedProviders = AI_PROVIDER_BRANDING.filter(
    (provider) => provider.surface === "advanced",
  );

  const refreshServerSettings = useCallback(async (): Promise<boolean> => {
    const requestId = ++serverSettingsRequestRef.current;
    setServerSettingsStatus("loading");

    const result = await loadSettingsServerSnapshot(() =>
      apiFetch("/api/settings"),
    );
    if (requestId !== serverSettingsRequestRef.current) return false;

    if (!result.ok) {
      setServerSettingsStatus("error");
      return false;
    }

    setKeyStatus(result.snapshot.status);
    if (result.snapshot.config) {
      const config = result.snapshot.config;
      const connectorPolicy = config.NEXUS_CONNECTOR_POLICY_JSON;
      const nextSecurityConfig = coerceSecurityConfig({
        ...config,
        NEXUS_CONNECTOR_POLICY_JSON:
          typeof connectorPolicy === "string"
            ? connectorPolicy
            : connectorPolicy
              ? JSON.stringify(connectorPolicy, null, 0)
              : "",
      } as Partial<SecurityConfig>);
      setSecurityConfig(nextSecurityConfig);
      setInitialSecurityConfig(nextSecurityConfig);
    }
    if (result.snapshot.release) {
      setReleaseInfo(result.snapshot.release as ReleaseInfo);
    }
    setServerSettingsStatus("ready");
    return true;
  }, []);

  // Load key status whenever drawer opens. Closing invalidates any pending result.
  useEffect(() => {
    if (!open) {
      serverSettingsRequestRef.current += 1;
      return;
    }
    void refreshServerSettings();
    return () => {
      serverSettingsRequestRef.current += 1;
      setServerSettingsStatus("idle");
    };
  }, [open, refreshServerSettings]);

  const refreshOllamaCatalog = useCallback(async () => {
    setOllamaCatalogLoading(true);
    try {
      const response = await apiFetch(
        `/api/ollama/catalog?model=${encodeURIComponent(settings.localModel || "")}`,
      );
      if (!response.ok) {
        setOllamaCatalog(null);
        return;
      }
      const payload = (await response.json()) as typeof ollamaCatalog;
      setOllamaCatalog(payload);
    } catch {
      setOllamaCatalog(null);
    } finally {
      setOllamaCatalogLoading(false);
    }
  }, [settings.localModel]);

  useEffect(() => {
    if (!open) return;
    void refreshOllamaCatalog();
  }, [open, refreshOllamaCatalog]);

  const handleSensitiveChange = (envKey: string, value: string) => {
    setSensitiveEdits((prev) => ({ ...prev, [envKey]: value }));
  };

  const save = useCallback(async () => {
    setSaving(true);
    setSaveErr("");

    // POST sensitive keys to server if any were edited
    const changedSecurityConfig = getChangedSecurityConfig(
      securityConfig,
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
        if (!r.ok || !d.ok) {
          setSaveErr(d.error ?? "Failed to save API keys.");
          setSaving(false);
          return;
        }
        if (d.needsRestart) {
          setSaveErr("Keys saved. Restart the dev server to apply them.");
        }
        // Clear the in-memory edits
        setSensitiveEdits({});
        const refreshed = await refreshServerSettings();
        if (!refreshed) setInitialSecurityConfig(securityConfig);
      } catch {
        setSaveErr("Could not reach the server. Is Next.js running?");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }, [
    initialSecurityConfig,
    refreshServerSettings,
    securityConfig,
    sensitiveEdits,
  ]);

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

  const dialogRef = useModalDialog({ open, onClose: handleClose });

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
        ref={dialogRef}
        className="nexus-sidepanel nexus-sidepanel--settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexus-settings-title"
        id="nexus-settings-dialog"
        data-testid="settings-dialog"
        tabIndex={-1}
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
            <span className="nexus-sidepanel__title" id="nexus-settings-title">
              Settings
            </span>
            <span className="nexus-sidepanel__subtitle">
              {BRAND_NAME} preferences, provider posture, and deployment policy
              in one place.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="nexus-sidepanel__close"
            data-testid="settings-close"
            data-dialog-initial-focus
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
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  lineHeight: 1.55,
                  marginBottom: 12,
                }}
              >
                {BRAND_NAME} keeps the primary operator lane free-first. Local
                and free-tier providers stay in the main path; paid-compatible
                lanes remain advanced and hidden unless you opt in.
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {[...primaryProviders, ...advancedProviders].map((provider) => {
                  const requiredEnvKeys =
                    provider.requiredEnvKeys ??
                    (provider.envKey ? [provider.envKey] : []);
                  const configured =
                    requiredEnvKeys.length === 0 ||
                    requiredEnvKeys.every(
                      (envKey) => keyStatus[envKey] === true,
                    );
                  const advancedLocked =
                    provider.surface === "advanced" &&
                    securityConfig.NEXUS_ALLOW_PAID_APIS !== "true";
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
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--text)",
                          }}
                        >
                          {provider.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text3)",
                            lineHeight: 1.45,
                          }}
                        >
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
                            : configured
                              ? "var(--fhi)"
                              : "var(--fmd)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {advancedLocked
                          ? "hidden"
                          : configured
                            ? "ready"
                            : provider.envKey
                              ? "needs key"
                              : "local"}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  — stored server-side in .env.local, never in the browser
                  session
                </span>
              </div>

              {serverSettingsStatus !== "idle" && (
                <div
                  role={serverSettingsStatus === "error" ? "alert" : "status"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    margin: "-4px 0 12px",
                    color:
                      serverSettingsStatus === "error"
                        ? "var(--flo)"
                        : "var(--text3)",
                    fontSize: "10px",
                    lineHeight: 1.4,
                  }}
                >
                  <span>
                    {serverSettingsStatus === "loading"
                      ? "Checking server settings status…"
                      : serverSettingsStatus === "ready"
                        ? "Server settings status verified."
                        : "Server settings status unavailable. Key state is unknown."}
                  </span>
                  {serverSettingsStatus === "error" && (
                    <button
                      type="button"
                      onClick={() => void refreshServerSettings()}
                      style={{
                        border: "1px solid var(--border2)",
                        borderRadius: "5px",
                        background: "var(--surf2)",
                        color: "var(--text)",
                        padding: "3px 7px",
                        fontSize: "10px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Retry server status
                    </button>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {SENSITIVE_FIELDS.map(({ key, label, envKey, placeholder }) => {
                  const hasVerifiedStatus = serverSettingsStatus === "ready";
                  const isSet = hasVerifiedStatus && keyStatus[envKey] === true;
                  const keyStatusLabel = !hasVerifiedStatus
                    ? serverSettingsStatus === "loading"
                      ? "… checking"
                      : "? unknown"
                    : isSet
                      ? "● set"
                      : "○ not set";
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
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color:
                              hasVerifiedStatus && isSet
                                ? "var(--fhi)"
                                : "var(--text3)",
                          }}
                        >
                          {keyStatusLabel}
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
                          handleSensitiveChange(envKey, e.target.value)
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
                  Network Mode
                </span>
                <select
                  value={securityConfig.NEXUS_NETWORK_MODE}
                  onChange={(e) =>
                    setSecurityConfig((prev) => ({
                      ...prev,
                      NEXUS_NETWORK_MODE: e.target
                        .value as SecurityConfig["NEXUS_NETWORK_MODE"],
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
                  Deployment Profile
                </span>
                <select
                  value={securityConfig.NEXUS_DEPLOYMENT_PROFILE}
                  onChange={(e) =>
                    setSecurityConfig((prev) => ({
                      ...prev,
                      NEXUS_DEPLOYMENT_PROFILE: e.target
                        .value as SecurityConfig["NEXUS_DEPLOYMENT_PROFILE"],
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
                  checked={
                    securityConfig.NEXUS_ENABLE_HIGH_RISK_TOOLS === "true"
                  }
                  onChange={(e) =>
                    setSecurityConfig((prev) => ({
                      ...prev,
                      NEXUS_ENABLE_HIGH_RISK_TOOLS: e.target.checked
                        ? "true"
                        : "false",
                    }))
                  }
                />
                <span style={{ fontSize: 12, color: "var(--text)" }}>
                  Enable high-risk API routes
                </span>
              </label>

              {/* Advanced provider unlock — requires explicit operator confirmation */}
              {securityConfig.NEXUS_ALLOW_PAID_APIS !== "true" &&
              !advancedConfirmed ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.28)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}
                  >
                    Advanced lanes hidden (Ollama-first posture)
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      lineHeight: 1.45,
                    }}
                  >
                    Paid-compatible providers (Groq, Azure OpenAI, OpenAI,
                    Anthropic, Google, MiniMax) stay off by default. Enabling
                    them routes inference to third-party APIs using your BYOK
                    keys — Nexus never charges you.
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdvancedConfirmed(true)}
                    style={{
                      alignSelf: "flex-start",
                      background: "rgba(245,158,11,0.15)",
                      border: "1px solid rgba(245,158,11,0.4)",
                      borderRadius: 6,
                      color: "#f59e0b",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    I understand — show advanced lanes
                  </button>
                </div>
              ) : (
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={securityConfig.NEXUS_ALLOW_PAID_APIS === "true"}
                    onChange={(e) => {
                      setSecurityConfig((prev) => ({
                        ...prev,
                        NEXUS_ALLOW_PAID_APIS: e.target.checked
                          ? "true"
                          : "false",
                      }));
                      if (!e.target.checked) setAdvancedConfirmed(false);
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text)" }}>
                    Unlock advanced paid-compatible AI lanes
                  </span>
                </label>
              )}

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginTop: 10,
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
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text2)",
                    lineHeight: 1.45,
                  }}
                >
                  Supported surface policy:{" "}
                  {releaseInfo?.supportedSurfacePolicy ??
                    RELEASE_DEFAULTS.supportedSurfacePolicy}
                  . Canonical deployment lane:{" "}
                  {releaseInfo?.canonicalDeploymentLane ??
                    RELEASE_DEFAULTS.canonicalDeploymentLane}
                  .
                </span>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  GA nav tabs: {releaseInfo?.surfaces.gaNav ?? 7}. Beta
                  surfaces: {releaseInfo?.surfaces.beta ?? 0}. Internal
                  surfaces: {releaseInfo?.surfaces.internal ?? 0}.
                </span>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  Default entrypoint:{" "}
                  {releaseInfo?.defaultEntrypoint ??
                    RELEASE_DEFAULTS.defaultEntrypoint}
                  . Shell version:{" "}
                  {releaseInfo?.uiShellVersion ??
                    RELEASE_DEFAULTS.uiShellVersion}
                  .
                </span>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  Build: {releaseInfo?.buildChannel ?? "dev"} /{" "}
                  {releaseInfo?.buildVersion ?? "local-dev"}
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
                  Preferred deployment lane
                </span>
                <select
                  value={settings.deploymentLanePreference}
                  onChange={(e) =>
                    updateSettings({
                      deploymentLanePreference: e.target
                        .value as Settings["deploymentLanePreference"],
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
                  Surface visibility preference
                </span>
                <select
                  value={settings.surfaceVisibilityPreference}
                  onChange={(e) =>
                    updateSettings({
                      surfaceVisibilityPreference: e.target
                        .value as Settings["surfaceVisibilityPreference"],
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
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <label
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
                    Local Model Name
                  </span>
                  <div
                    style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                  >
                    <input
                      type="text"
                      value={settings.localModel}
                      placeholder="qwen3:8b"
                      onChange={(e) =>
                        updateSettings({ localModel: e.target.value })
                      }
                      style={{
                        background: "var(--surf2)",
                        border: "1px solid var(--border2)",
                        borderRadius: "6px",
                        color: "var(--text)",
                        fontSize: "12px",
                        padding: "7px 10px",
                        outline: "none",
                        flex: "1 1 160px",
                        minWidth: 0,
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void refreshOllamaCatalog()}
                      disabled={ollamaCatalogLoading}
                      style={{
                        background: "var(--surf3)",
                        border: "1px solid var(--border2)",
                        borderRadius: "6px",
                        color: "var(--text)",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "7px 10px",
                        cursor: "pointer",
                      }}
                    >
                      {ollamaCatalogLoading
                        ? "Refreshing…"
                        : "Refresh from Ollama"}
                    </button>
                  </div>
                  {ollamaCatalog?.models?.length ? (
                    <select
                      value={settings.localModel}
                      onChange={(e) =>
                        updateSettings({ localModel: e.target.value })
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
                      {ollamaCatalog.models.map((model) => (
                        <option key={model.name} value={model.name}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {ollamaCatalog ? (
                    <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                      {ollamaCatalog.reachable
                        ? `Resolved: ${ollamaCatalog.resolvedModel ?? "none"} (${ollamaCatalog.resolutionReason})`
                        : "Ollama not reachable at the configured endpoint."}
                    </span>
                  ) : null}
                </label>
                {LOCAL_FIELDS.map(({ key, label, type, placeholder }) => {
                  const val = settings[key];
                  if (Array.isArray(val) || typeof val === "object")
                    return null;
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
                    </label>
                  );
                })}
                <div
                  data-testid="personal-ai-profile-status"
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border2)",
                    borderRadius: 8,
                    background: personalAIProfile.active
                      ? "rgba(16,185,129,0.07)"
                      : "var(--surf2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: personalAIProfile.active
                          ? "var(--fhi)"
                          : "var(--text3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Personal AI Profile
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      {personalAIProfile.activeSectionCount}/
                      {personalAIProfile.totalSectionCount} active
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      lineHeight: 1.45,
                    }}
                  >
                    {personalAIProfile.active
                      ? `Available to MAX and the specialist runtime: ${personalAIProfile.sections
                          .map((section) => section.label)
                          .join(", ")}.`
                      : "Add goals, skills, learning, or working context to activate consistent personalization."}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text3)",
                      lineHeight: 1.4,
                    }}
                  >
                    Uses only what you enter here. It cannot grant tool access,
                    approve actions, or infer emotions and personal traits.
                  </span>
                </div>
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
                    HQ Layout
                  </span>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(settings.hqCompactOperatorLayout)}
                      onChange={(e) =>
                        updateSettings({
                          hqCompactOperatorLayout: e.target.checked,
                          ...(e.target.checked
                            ? { hqConsoleFocusMode: "chat" }
                            : {}),
                        } as Partial<Settings>)
                      }
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text)",
                        lineHeight: 1.45,
                      }}
                    >
                      Compact HQ (chat-first) — reduce the command workspace,
                      sector rail, strategium deck, and full readiness
                      checklists. Phone always uses compact layout.
                    </span>
                  </label>
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
                    checked={Boolean(
                      settings.agentHighRiskWritesRequireApproval,
                    )}
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
              onClick={save}
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
