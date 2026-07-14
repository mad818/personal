"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  FreeLocalReadinessSection,
  FreeLocalReadinessSnapshot,
  FreeLocalReadinessStatus,
} from "@/lib/freeLocalReadiness";
import { formatFreeLocalStatusLabel } from "@/lib/freeLocalReadiness";
import {
  FREE_LOCAL_MAJOR_UPDATES,
  buildPhoneAcceptanceBrief,
  buildLocalAiProofSnapshot,
  buildPhoneAcceptanceChecklist,
  buildRepoSyncHealthReport,
  getStepTone,
  type PhoneAcceptanceStep,
} from "@/lib/freeLocalOperations";
import type {
  PhoneAcceptanceLiveStatus,
  PhoneAcceptanceLiveStatusItem,
} from "@/lib/phoneAcceptanceStatus";
import { buildPhoneHandoffQrMatrix } from "@/lib/phoneHandoffQr";
import { promptForPhoneAcceptanceAction, type PhoneAcceptanceActionId } from "@/lib/phoneAcceptanceActions";
import { usePhonePosture } from "@/hooks/usePhonePosture";
import PhoneAcceptanceActionBar from "@/components/ui/PhoneAcceptanceActionBar";
import { useStore } from "@/store/useStore";
import { ShellBadge, ShellButton } from "@/components/ui/shell";
import OperationalLightGrid from "@/components/ui/OperationalLightGrid";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { buildOperationalLightGrid } from "@/lib/operationalLights";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { useActionDialog } from "@/hooks/useActionDialog";

type BrowserStorageStatus = "checking" | "ready" | "blocked";

function badgeTone(status: FreeLocalReadinessStatus) {
  if (status === "ready") return "success" as const;
  if (status === "blocked") return "accent" as const;
  return "muted" as const;
}

function calloutTone(status: FreeLocalReadinessStatus) {
  if (status === "ready") return "success" as const;
  if (status === "blocked") return "warning" as const;
  return "info" as const;
}

function storageLabel(status: BrowserStorageStatus) {
  if (status === "ready") return "Browser storage ready";
  if (status === "blocked") return "Browser storage blocked";
  return "Checking browser storage";
}

function getPwaDisplayMode() {
  try {
    const navigatorWithStandalone = navigator as Navigator & {
      standalone?: boolean;
    };
    if (
      navigatorWithStandalone.standalone === true ||
      window.matchMedia?.("(display-mode: standalone)")?.matches
    ) {
      return "standalone";
    }
    return "browser";
  } catch {
    return "unknown";
  }
}

function getCurrentInternalRoute() {
  try {
    return `${window.location.pathname}${window.location.search}`;
  } catch {
    return "/";
  }
}

function ReadinessRow({ item }: { item: FreeLocalReadinessSection }) {
  return (
    <div className="nexus-free-local-readiness__row rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
          {item.label}
        </span>
        <ShellBadge tone={badgeTone(item.status)}>
          {formatFreeLocalStatusLabel(item.status)}
        </ShellBadge>
      </div>
      <div className="mt-1 text-sm font-black text-[var(--text)]">
        {item.value}
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{item.detail}</p>
    </div>
  );
}

function stepLabel(status: PhoneAcceptanceStep["status"]) {
  if (status === "done") return "done";
  if (status === "ready") return "ready";
  if (status === "blocked") return "blocked";
  return "manual";
}

function ChecklistStep({ step }: { step: PhoneAcceptanceStep }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--text)]">
            {step.label}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            {step.detail}
          </p>
        </div>
        <ShellBadge tone={badgeTone(getStepTone(step.status))}>
          {stepLabel(step.status)}
        </ShellBadge>
      </div>
      {step.href ? (
        <a
          className="mt-2 inline-flex text-xs font-black text-cyan-100 underline decoration-cyan-200/30 underline-offset-4"
          href={step.href}
        >
          Open target
        </a>
      ) : null}
      {step.command ? (
        <code className="mt-2 block overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]">
          {step.command}
        </code>
      ) : null}
      <div className="mt-2 text-[11px] font-bold leading-5 text-[var(--text3)]">
        Proof: {step.proof}
      </div>
    </div>
  );
}

function LiveStatusProofItem({ item }: { item: PhoneAcceptanceLiveStatusItem }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-black text-[var(--text)]">
          {item.label}
        </div>
        <ShellBadge tone={item.passed ? "success" : "muted"}>
          {item.passed ? "done" : "waiting"}
        </ShellBadge>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
        {item.detail}
      </p>
    </div>
  );
}

function PhoneHandoffQr({
  qr,
}: {
  qr: NonNullable<ReturnType<typeof buildPhoneHandoffQrMatrix>>;
}) {
  const viewSize = qr.size + qr.quietZone * 2;
  return (
    <svg
      aria-label="QR code for direct HQ URL"
      className="aspect-square w-full max-w-[180px] rounded-xl border border-white/10 bg-white p-2"
      role="img"
      viewBox={`0 0 ${viewSize} ${viewSize}`}
    >
      <rect width={viewSize} height={viewSize} fill="white" />
      <path d={qr.path} fill="black" />
    </svg>
  );
}

export default function FreeLocalReadinessPanel({
  compact = false,
  mobileLane = false,
  onPhoneSendPrompt,
}: {
  surface?: "hq" | "command";
  compact?: boolean;
  mobileLane?: boolean;
  onPhoneSendPrompt?: (prompt: string) => void | Promise<void>;
}) {
  const settings = useStore((s) => s.settings);
  const [snapshot, setSnapshot] = useState<FreeLocalReadinessSnapshot | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneAcceptanceStatus, setPhoneAcceptanceStatus] =
    useState<PhoneAcceptanceLiveStatus | null>(null);
  const [phoneAcceptanceStatusLoading, setPhoneAcceptanceStatusLoading] =
    useState(false);
  const [browserStorage, setBrowserStorage] =
    useState<BrowserStorageStatus>("checking");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [phoneActionBusy, setPhoneActionBusy] = useState(false);
  const actionDialog = useActionDialog();
  const { requestActionDialog } = actionDialog;
  const receiptPingedRef = useRef(false);
  const phonePosture = usePhonePosture();
  const useMobileLane = mobileLane || phonePosture;

  useEffect(() => {
    try {
      const key = "__nexus_free_local_storage_probe";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      setBrowserStorage("ready");
    } catch {
      setBrowserStorage("blocked");
    }
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (settings.localModel) params.set("model", settings.localModel);
      const url = `/api/free-local-readiness${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiFetch(url, { cache: "no-store", signal });
      if (signal?.aborted) return;
      if (response.status === 401 || response.status === 403) {
        setSnapshot(null);
        setLoadError("Session required. Log in with NEXUS_TOKEN, then refresh readiness.");
        return;
      }
      if (!response.ok) {
        setSnapshot(null);
        setLoadError(`Readiness check failed with HTTP ${response.status}.`);
        return;
      }
      setSnapshot((await response.json()) as FreeLocalReadinessSnapshot);
    } catch {
      if (signal?.aborted) return;
      setSnapshot(null);
      setLoadError("Readiness check could not reach the local runtime.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [settings.localModel]);

  const refreshPhoneAcceptanceStatus = useCallback(
    async (signal?: AbortSignal) => {
      setPhoneAcceptanceStatusLoading(true);
      try {
        const response = await apiFetch("/api/phone-acceptance/receipt", {
          cache: "no-store",
          signal,
        });
        if (signal?.aborted) return;
        if (!response.ok) {
          setPhoneAcceptanceStatus(null);
          return;
        }
        const payload = (await response.json()) as {
          status?: PhoneAcceptanceLiveStatus;
        };
        setPhoneAcceptanceStatus(payload.status ?? null);
      } catch {
        if (!signal?.aborted) setPhoneAcceptanceStatus(null);
      } finally {
        if (!signal?.aborted) setPhoneAcceptanceStatusLoading(false);
      }
    },
    [],
  );

  const copyToClipboard = useCallback(async (label: string, value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedTarget(label);
      window.setTimeout(() => setCopiedTarget(null), 1800);
    } catch {
      setCopiedTarget("Copy blocked");
      window.setTimeout(() => setCopiedTarget(null), 2200);
    }
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;
    const run = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      void refresh(controller.signal);
    };
    run();
    const interval = window.setInterval(run, 30_000);
    const handleVisibility = () => {
      if (document.hidden) return;
      run();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (!snapshot) {
      setPhoneAcceptanceStatus(null);
      return;
    }

    let controller: AbortController | null = null;
    const run = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      void refreshPhoneAcceptanceStatus(controller.signal);
    };

    run();
    const interval = window.setInterval(run, 15_000);
    const handleVisibility = () => {
      if (document.hidden) return;
      run();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshPhoneAcceptanceStatus, snapshot]);

  const postPhoneReceipt = useCallback(
    async (force = false) => {
      if (!snapshot) return;
      const route = getCurrentInternalRoute();
      const receiptKey = `nexus-phone-acceptance-receipt:${route}`;
      if (!force) {
        try {
          if (window.sessionStorage.getItem(receiptKey)) return;
        } catch {
          // Session storage can be blocked on phone browsers.
        }
      }

      try {
        const pwaDisplayMode = getPwaDisplayMode();
        const response = await apiFetch("/api/phone-acceptance/receipt", {
          method: "POST",
          cache: "no-store",
          body: JSON.stringify({
            source: "free-local-readiness-panel",
            route,
            browserStorageReady: browserStorage === "ready",
            pwaDisplayMode,
            pwaCapable:
              snapshot.phoneLan.pwaReady &&
              typeof navigator !== "undefined" &&
              "serviceWorker" in navigator,
          }),
        });
        if (!response.ok) {
          receiptPingedRef.current = false;
          return;
        }
        try {
          const payload = (await response.json()) as {
            status?: PhoneAcceptanceLiveStatus;
          };
          if (payload.status) setPhoneAcceptanceStatus(payload.status);
        } catch {
          // Silent: receipt succeeded.
        }
        try {
          window.sessionStorage.setItem(receiptKey, "1");
        } catch {
          // Silent.
        }
      } catch {
        receiptPingedRef.current = false;
      }
    },
    [browserStorage, snapshot],
  );

  const handlePhoneAction = useCallback(
    async (actionId: PhoneAcceptanceActionId) => {
      setPhoneActionBusy(true);
      try {
        if (actionId === "refreshReceipt") {
          receiptPingedRef.current = false;
          await postPhoneReceipt(true);
          await refreshPhoneAcceptanceStatus();
          return;
        }
        if (actionId === "installPwa") {
          await requestActionDialog({
            eyebrow: "Phone setup",
            title: "Install Nexus on this device",
            description:
              "iPhone: tap Share, then Add to Home Screen.\nAndroid: tap Install app or Add to Home screen.\nThen reopen Nexus from your home screen.",
            confirmLabel: "Done",
            cancelLabel: null,
          });
          await refreshPhoneAcceptanceStatus();
          return;
        }
        const prompt = promptForPhoneAcceptanceAction(actionId);
        if (prompt && onPhoneSendPrompt) {
          await onPhoneSendPrompt(prompt);
          window.setTimeout(() => {
            void refreshPhoneAcceptanceStatus();
          }, 1200);
        }
      } finally {
        setPhoneActionBusy(false);
      }
    },
    [
      onPhoneSendPrompt,
      postPhoneReceipt,
      requestActionDialog,
      refreshPhoneAcceptanceStatus,
    ],
  );

  useEffect(() => {
    if (!snapshot || browserStorage === "checking" || receiptPingedRef.current) {
      return;
    }

    receiptPingedRef.current = true;
    void postPhoneReceipt(false);
  }, [browserStorage, postPhoneReceipt, snapshot]);

  const rows = useMemo(() => {
    if (!snapshot) return [];
    return [
      snapshot.freeInvariant,
      snapshot.networkMode,
      snapshot.paidApisAllowed,
      snapshot.ollama,
      snapshot.resolvedModel,
      snapshot.session,
      snapshot.toolPosture,
      snapshot.phoneLan,
    ];
  }, [snapshot]);

  const storageTone =
    browserStorage === "ready"
      ? "success"
      : browserStorage === "blocked"
        ? "accent"
        : "muted";

  const localAiSummary = snapshot
    ? snapshot.ollama.reachable && snapshot.resolvedModel.resolvedModel
      ? `Local AI: ${snapshot.resolvedModel.resolvedModel}`
      : "Local AI needs recovery"
    : "Local AI checking";

  const phoneLanReady =
    Boolean(snapshot?.phoneLan.enabled) &&
    Boolean(snapshot?.phoneLan.preferredLanUrl);
  const phoneHandoffQr = useMemo(
    () => buildPhoneHandoffQrMatrix(snapshot?.phoneLan.preferredHqLanUrl),
    [snapshot?.phoneLan.preferredHqLanUrl],
  );
  const phoneChecklist = useMemo(
    () => buildPhoneAcceptanceChecklist(snapshot),
    [snapshot],
  );
  const phoneAcceptanceBrief = useMemo(
    () => buildPhoneAcceptanceBrief(snapshot),
    [snapshot],
  );
  const localAiProof = useMemo(
    () => buildLocalAiProofSnapshot(snapshot),
    [snapshot],
  );
  const repoSync = useMemo(() => buildRepoSyncHealthReport(), []);
  const operationalLights = useMemo(
    () =>
      buildOperationalLightGrid({
        freeLocal: snapshot,
        runtimeOk: snapshot ? snapshot.runtime.status === "ready" : null,
        protectedStatusOk: snapshot ? snapshot.session.authenticated : null,
      }),
    [snapshot],
  );

  const rowsGrid = rows.length ? (
    <div
      className={
        compact
          ? "nexus-free-local-readiness__rows grid gap-2 md:grid-cols-2"
          : "nexus-free-local-readiness__rows grid gap-2 md:grid-cols-2 xl:grid-cols-4"
      }
    >
      {rows.map((item) => (
        <ReadinessRow key={item.label} item={item} />
      ))}
    </div>
  ) : null;

  if (useMobileLane) {
    return (
      <div
        data-testid="free-local-readiness-panel"
        className="nexus-free-local-readiness nexus-free-local-readiness--mobile-lane"
      >
        <PhoneAcceptanceActionBar
          status={phoneAcceptanceStatus}
          sessionAuthenticated={Boolean(snapshot?.session.authenticated)}
          busy={phoneActionBusy || phoneAcceptanceStatusLoading}
          onAction={(actionId) => void handlePhoneAction(actionId)}
        />
        <ActionDialog controller={actionDialog} />
      </div>
    );
  }

  return (
    <SurfaceCallout
      tone={snapshot ? calloutTone(snapshot.overallStatus) : "info"}
      compact
      icon="Local"
      title={snapshot?.headline ?? "Checking free local readiness"}
      description={
        snapshot?.summary ??
        loadError ??
        "Checking the local runtime, Ollama, free-use posture, and phone LAN path."
      }
    >
      <div
        data-testid="free-local-readiness-panel"
        className="nexus-free-local-readiness grid gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          {snapshot ? (
            <>
              <ShellBadge tone={badgeTone(snapshot.overallStatus)}>
                {formatFreeLocalStatusLabel(snapshot.overallStatus)}
              </ShellBadge>
              <ShellBadge tone={snapshot.paidApisAllowed.allowed ? "accent" : "success"}>
                Paid APIs {snapshot.paidApisAllowed.allowed ? "allowed" : "blocked"}
              </ShellBadge>
              <ShellBadge tone={snapshot.networkMode.mode === "isolated" ? "success" : "muted"}>
                Network {snapshot.networkMode.mode}
              </ShellBadge>
              <ShellBadge tone={snapshot.ollama.reachable ? "success" : "accent"}>
                Ollama {snapshot.ollama.reachable ? "ready" : "offline"}
              </ShellBadge>
              <ShellBadge
                tone={
                  snapshot.ollama.reachable && snapshot.resolvedModel.resolvedModel
                    ? "success"
                    : "accent"
                }
              >
                {localAiSummary}
              </ShellBadge>
            </>
          ) : (
            <ShellBadge tone="muted">
              {loadError ? "recovery needed" : "checking"}
            </ShellBadge>
          )}
          <ShellBadge tone={storageTone}>{storageLabel(browserStorage)}</ShellBadge>
          <ShellButton onClick={() => void refresh()} disabled={loading}>
            {loading ? "Checking..." : "Run local check"}
          </ShellButton>
          <a className="nexus-shell-button" href="/command?focus=provider-health">
            Open provider health
          </a>
        </div>

        <OperationalLightGrid
          grid={operationalLights}
          variant={compact ? "compact" : "panel"}
          title="Local readiness lights"
        />

        {snapshot ? (
          <div
            className={
              phoneLanReady
                ? "rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3"
                : "rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            }
            data-testid="free-local-phone-lan-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                  Phone handoff
                </div>
                <div className="mt-1 text-sm font-black text-[var(--text)]">
                  {phoneLanReady
                    ? "Phone URL is ready"
                    : "Phone URL appears when LAN mode is running"}
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text2)]">
                  Desktop stays on, phone stays on the same network, and{" "}
                  {snapshot.phoneLan.tokenRequired
                    ? snapshot.phoneLan.phoneTokenConfigured
                      ? "Use NEXUS_PHONE_TOKEN on the phone (or NEXUS_TOKEN for full access)."
                      : "NEXUS_TOKEN is required before protected routes open."
                    : "this local runtime is not requiring a token."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ShellBadge tone={phoneLanReady ? "success" : "muted"}>
                  {snapshot.phoneLan.enabled ? "LAN enabled" : "LAN disabled"}
                </ShellBadge>
                <ShellButton
                  onClick={() =>
                    void copyToClipboard("Acceptance steps", phoneAcceptanceBrief)
                  }
                >
                  {copiedTarget === "Acceptance steps"
                    ? "Steps copied"
                    : "Copy acceptance steps"}
                </ShellButton>
              </div>
            </div>

            {phoneLanReady ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                    Phone home
                  </div>
                  <code className="mt-2 block overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]">
                    {snapshot.phoneLan.preferredLanUrl}
                  </code>
                  <ShellButton
                    className="mt-2"
                    onClick={() =>
                      void copyToClipboard(
                        "Phone home",
                        snapshot.phoneLan.preferredLanUrl ?? "",
                      )
                    }
                  >
                    {copiedTarget === "Phone home" ? "Copied" : "Copy phone URL"}
                  </ShellButton>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                    Direct HQ
                  </div>
                  <code className="mt-2 block overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]">
                    {snapshot.phoneLan.preferredHqLanUrl}
                  </code>
                  <ShellButton
                    className="mt-2"
                    onClick={() =>
                      void copyToClipboard(
                        "Direct HQ",
                        snapshot.phoneLan.preferredHqLanUrl ?? "",
                      )
                    }
                  >
                    {copiedTarget === "Direct HQ" ? "Copied" : "Copy HQ URL"}
                  </ShellButton>
                </div>
                <div
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                  data-testid="free-local-phone-handoff-qr"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                    Scan direct HQ
                  </div>
                  <div className="mt-2 flex justify-center">
                    {phoneHandoffQr ? (
                      <PhoneHandoffQr qr={phoneHandoffQr} />
                    ) : (
                      <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs leading-5 text-[var(--text2)]">
                        QR is unavailable for this URL. Use Copy HQ URL.
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-[var(--text3)]">
                    Offline QR. Encodes only the visible HQ URL.
                  </p>
                </div>
              </div>
            ) : (
              <code className="mt-3 block rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]">
                npm run phone:lan:start
              </code>
            )}

            {phoneLanReady && snapshot.phoneLan.hqLanUrls.length > 1 ? (
              <div className="mt-2 text-[11px] leading-5 text-[var(--text3)]">
                Other detected HQ URLs: {snapshot.phoneLan.hqLanUrls.slice(1).join(" · ")}
              </div>
            ) : null}

            {copiedTarget === "Copy blocked" ? (
              <div className="mt-2 text-[11px] font-bold text-amber-200">
                Browser blocked clipboard access. Select the URL text and copy it manually.
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="grid gap-3 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.04] p-3"
          data-testid="free-local-phone-acceptance-checklist"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                {phoneChecklist.title}
              </div>
              <div className="mt-1 text-sm font-black text-[var(--text)]">
                Phone proves local/free before anything else.
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text2)]">
                {phoneChecklist.summary}
              </p>
            </div>
            <ShellBadge tone={badgeTone(phoneChecklist.overallStatus)}>
              {formatFreeLocalStatusLabel(phoneChecklist.overallStatus)}
            </ShellBadge>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {phoneChecklist.steps.map((step) => (
              <ChecklistStep key={step.id} step={step} />
            ))}
          </div>
          <div
            className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
            data-testid="free-local-phone-acceptance-live-status"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                  Live receipt proof
                </div>
                <div className="mt-1 text-sm font-black text-[var(--text)]">
                  {phoneAcceptanceStatus?.acceptanceReady
                    ? "Phone acceptance proof is complete"
                    : "Waiting for phone receipt proof"}
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text2)]">
                  Protected receipts update here with booleans, counts, and sanitized
                  timestamps only.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ShellBadge
                  tone={
                    phoneAcceptanceStatus
                      ? badgeTone(phoneAcceptanceStatus.overallStatus)
                      : "muted"
                  }
                >
                  {phoneAcceptanceStatus
                    ? formatFreeLocalStatusLabel(
                        phoneAcceptanceStatus.overallStatus,
                      )
                    : "checking"}
                </ShellBadge>
                <ShellButton
                  onClick={() => void refreshPhoneAcceptanceStatus()}
                  disabled={phoneAcceptanceStatusLoading}
                >
                  {phoneAcceptanceStatusLoading
                    ? "Refreshing..."
                    : "Refresh receipt proof"}
                </ShellButton>
              </div>
            </div>
            {phoneAcceptanceStatus ? (
              <>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {phoneAcceptanceStatus.items.map((item) => (
                    <LiveStatusProofItem key={item.id} item={item} />
                  ))}
                </div>
                <div className="text-[11px] font-bold leading-5 text-[var(--text3)]">
                  Mobile receipts: {phoneAcceptanceStatus.mobileReceiptCount} /{" "}
                  {phoneAcceptanceStatus.receiptCount}
                  {phoneAcceptanceStatus.latestAt
                    ? ` · Latest ${phoneAcceptanceStatus.latestAt}`
                    : " · No recent receipt yet"}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-[var(--text2)]">
                Receipt status will appear after the protected local receipt API is
                reachable from this session.
              </div>
            )}
          </div>
        </div>

        <details
          className="nexus-free-local-readiness__details"
          data-testid="free-local-ai-proof-summary"
          open={!compact}
        >
          <summary>{localAiProof.title}</summary>
          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-5">
            {localAiProof.checks.map((step) => (
              <ChecklistStep key={step.id} step={step} />
            ))}
          </div>
        </details>

        <details
          className="nexus-free-local-readiness__details"
          data-testid="free-local-major-updates"
        >
          <summary>Major update queue</summary>
          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
            {FREE_LOCAL_MAJOR_UPDATES.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-[var(--text)]">
                    {item.label}
                  </div>
                  <ShellBadge
                    tone={
                      item.status === "active"
                        ? "success"
                        : item.status === "blocked"
                          ? "accent"
                          : "muted"
                    }
                  >
                    {item.status}
                  </ShellBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text2)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </details>

        <div
          className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-3"
          data-testid="free-local-repo-sync-report"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
                {repoSync.title}
              </div>
              <div className="mt-1 text-sm font-black text-[var(--text)]">
                {repoSync.blocker ?? "Repo sync ready"}
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text2)]">
                {repoSync.detail}
              </p>
              <p className="mt-2 text-[11px] font-bold leading-5 text-[var(--text3)]">
                Runbook: {repoSync.recoveryDocPath}
              </p>
            </div>
            <ShellBadge tone={repoSync.status === "ready" ? "success" : "accent"}>
              {repoSync.status}
            </ShellBadge>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
              First diagnostic
            </div>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]">
              {repoSync.diagnosticCommand}
            </code>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {repoSync.recoverySteps.map((step) => (
              <div
                key={step.id}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="text-sm font-black text-[var(--text)]">
                  {step.label}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                  {step.detail}
                </p>
                <code className="mt-2 block overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]">
                  {step.command}
                </code>
                {step.safetyNote ? (
                  <p className="mt-2 text-[11px] font-bold leading-5 text-amber-100/80">
                    {step.safetyNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {repoSync.proofCommands.map((command) => (
              <code
                key={command}
                className="block overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-[var(--text)]"
              >
                {command}
              </code>
            ))}
          </div>
        </div>

        {loadError ? (
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-[var(--text2)]">
            {loadError}
          </div>
        ) : null}

        {rowsGrid && compact ? (
          <details className="nexus-free-local-readiness__details">
            <summary>Readiness details</summary>
            {rowsGrid}
          </details>
        ) : (
          rowsGrid
        )}

        {snapshot?.recoveryActions.length ? (
          <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
              Recovery actions
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {snapshot.recoveryActions.map((action) => (
                <div
                  key={`${action.label}-${action.command ?? action.href ?? action.detail}`}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs leading-5 text-[var(--text2)]"
                >
                  <div className="font-black text-[var(--text)]">
                    {action.href ? (
                      <a href={action.href}>{action.label}</a>
                    ) : (
                      action.label
                    )}
                  </div>
                  <div>{action.detail}</div>
                  {action.command ? (
                    <code className="mt-1 block rounded-md bg-black/30 px-2 py-1 text-[10px] text-[var(--text)]">
                      {action.command}
                    </code>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <ActionDialog controller={actionDialog} />
      </div>
    </SurfaceCallout>
  );
}
