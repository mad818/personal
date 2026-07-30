"use client";

import { useMemo } from "react";
import { ShellButton } from "@/components/ui/shell";
import {
  buildPhoneAcceptancePendingActions,
  type PhoneAcceptanceActionId,
} from "@/lib/phoneAcceptanceActions";
import type { PhoneAcceptanceLiveStatus } from "@/lib/phoneAcceptanceStatus";

/**
 * Returns true only when the browser genuinely supports PWA installation.
 * Brave on iOS and all non-Safari iOS browsers cannot install PWAs, so we
 * hide the "Install app" step rather than showing a button that does nothing.
 */
function detectPwaCapable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  if (!("serviceWorker" in navigator)) return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (!isIos) return true;
  // On iOS, only Safari supports PWA install. Brave's UA still contains Safari
  // but also exposes navigator.brave. Chrome/Firefox/Brave on iOS cannot install.
  const isSafariOnIos =
    /safari/i.test(ua) &&
    !/crios|fxios|brave|chrome/i.test(ua) &&
    !("brave" in navigator);
  return isSafariOnIos;
}

type Props = {
  status: PhoneAcceptanceLiveStatus | null;
  sessionAuthenticated: boolean;
  busy?: boolean;
  onAction: (actionId: PhoneAcceptanceActionId) => void;
};

export default function PhoneAcceptanceActionBar({
  status,
  sessionAuthenticated,
  busy = false,
  onAction,
}: Props) {
  const canInstallPwa = useMemo(() => detectPwaCapable(), []);
  const actions = buildPhoneAcceptancePendingActions(status, {
    sessionAuthenticated,
    canInstallPwa,
  });

  if (status?.acceptanceReady) {
    return null;
  }

  if (!actions.length) {
    return (
      <div
        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-[var(--text2)]"
        data-testid="phone-acceptance-action-bar"
      >
        Phone proof is syncing…
      </div>
    );
  }

  return (
    <div className="grid gap-2" data-testid="phone-acceptance-action-bar">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text3)]">
        Phone setup
      </div>
      {actions.map((action) => (
        <div
          key={action.id}
          className="flex flex-col gap-2 rounded-xl border border-cyan-200/20 bg-cyan-200/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="text-sm font-black text-[var(--text)]">
              {action.label}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
              {action.detail}
            </p>
          </div>
          <ShellButton
            className="shrink-0"
            disabled={busy}
            onClick={() => onAction(action.id)}
          >
            {busy ? "Working…" : action.label}
          </ShellButton>
        </div>
      ))}
    </div>
  );
}
