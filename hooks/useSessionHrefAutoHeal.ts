"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeSessionHref } from "@/lib/exactSessionLinks";

export function useSessionHrefAutoHeal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingHrefRef = useRef<string | null>(null);

  const currentHref = useMemo(() => {
    if (!pathname) return "";
    return searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  }, [pathname, searchParams]);

  const normalizedHref = useMemo(() => {
    if (!pathname) return "";
    return normalizeSessionHref(currentHref);
  }, [currentHref, pathname]);

  const normalizedUrl = useMemo(
    () => new URL(normalizedHref || pathname || "/", "http://nexus.local"),
    [normalizedHref, pathname],
  );

  const normalizedParams = useMemo(
    () => new URLSearchParams(normalizedUrl.searchParams.toString()),
    [normalizedUrl],
  );

  const isCanonical = !pathname || normalizedHref === currentHref;

  useEffect(() => {
    if (isCanonical) {
      pendingHrefRef.current = null;
    }
  }, [isCanonical]);

  useLayoutEffect(() => {
    if (!pathname) return;
    if (isCanonical || pendingHrefRef.current === normalizedHref) return;

    pendingHrefRef.current = normalizedHref;

    const browserHref =
      window.location.pathname + window.location.search + window.location.hash;

    if (browserHref !== normalizedHref) {
      window.history.replaceState(window.history.state, "", normalizedHref);
    }

    router.replace(normalizedHref);
  }, [isCanonical, normalizedHref, pathname, router]);

  return {
    currentHref,
    normalizedHref,
    normalizedParams,
    normalizedPathname: normalizedUrl.pathname,
    isCanonical,
  };
}
