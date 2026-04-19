"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pruneUnfinishedSessions } from "@/lib/assistantSessionMemory";
import { isExactSessionHref, normalizeSessionHref } from "@/lib/exactSessionLinks";
import { resolveAssistantSessionHref } from "@/lib/assistantSessionRecovery";
import { useStore } from "@/store/useStore";

export default function PreparedWorkspaceAutoHeal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preparedWorkspace = useStore((state) => state.preparedWorkspace);
  const unfinishedSessions = useStore((state) => state.unfinishedSessions);
  const touchUnfinishedSession = useStore((state) => state.touchUnfinishedSession);
  const pendingHrefRef = useRef<string | null>(null);
  const activeHrefRef = useRef<string | null>(null);

  const currentHref = useMemo(() => {
    if (!pathname) return "";
    return searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  }, [pathname, searchParams]);

  const normalizedCurrentHref = useMemo(
    () => normalizeSessionHref(currentHref || pathname || "/"),
    [currentHref, pathname],
  );

  const normalizedUnfinishedSessions = useMemo(
    () => pruneUnfinishedSessions(unfinishedSessions),
    [unfinishedSessions],
  );

  const recoveryHref = useMemo(() => {
    return resolveAssistantSessionHref({
      href: normalizedCurrentHref,
      pathname,
      preparedWorkspace,
      unfinishedSessions: normalizedUnfinishedSessions,
      includeRouteDefault: true,
    });
  }, [
    normalizedCurrentHref,
    pathname,
    preparedWorkspace,
    normalizedUnfinishedSessions,
  ]);

  useLayoutEffect(() => {
    if (pendingHrefRef.current === normalizedCurrentHref) {
      pendingHrefRef.current = null;
    }
  }, [normalizedCurrentHref]);

  useLayoutEffect(() => {
    if (!isExactSessionHref(normalizedCurrentHref)) {
      activeHrefRef.current = null;
      return;
    }
    const matchingCurrentSession = normalizedUnfinishedSessions.find(
      (session) => normalizeSessionHref(session.href) === normalizedCurrentHref,
    );
    if (!matchingCurrentSession) {
      activeHrefRef.current = null;
      return;
    }
    if (activeHrefRef.current === normalizedCurrentHref) return;
    activeHrefRef.current = normalizedCurrentHref;
    touchUnfinishedSession(normalizedCurrentHref, "active");
  }, [
    normalizedCurrentHref,
    normalizedUnfinishedSessions,
    touchUnfinishedSession,
  ]);

  useLayoutEffect(() => {
    if (!pathname || !recoveryHref || !isExactSessionHref(recoveryHref)) return;

    const recoveryUrl = new URL(recoveryHref, "http://nexus.local");
    const currentUrl = new URL(normalizedCurrentHref, "http://nexus.local");
    if (recoveryUrl.pathname !== currentUrl.pathname) return;
    if (recoveryHref === normalizedCurrentHref) return;
    if (isExactSessionHref(normalizedCurrentHref)) return;
    if (pendingHrefRef.current === recoveryHref) return;

    pendingHrefRef.current = recoveryHref;

    const browserHref =
      window.location.pathname + window.location.search + window.location.hash;
    if (browserHref !== recoveryHref) {
      window.history.replaceState(window.history.state, "", recoveryHref);
    }
    router.replace(recoveryHref);
  }, [
    normalizedCurrentHref,
    pathname,
    recoveryHref,
    router,
  ]);

  return null;
}
