"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  getShellPerformancePlan,
  type ShellDataCapability,
} from "@/lib/shellPerformance";

const ArticlesLoader = dynamic(
  () =>
    import("@/components/ui/DataLoader").then(
      (module) => module.ArticlesLoader,
    ),
  { ssr: false },
);
const CVEsLoader = dynamic(
  () =>
    import("@/components/ui/DataLoader").then((module) => module.CVEsLoader),
  { ssr: false },
);
const FearGreedLoader = dynamic(
  () =>
    import("@/components/ui/DataLoader").then(
      (module) => module.FearGreedLoader,
    ),
  { ssr: false },
);
const GlobalDataLoader = dynamic(
  () => import("@/components/ui/GlobalDataLoader"),
  { ssr: false },
);
const PricesLoader = dynamic(
  () =>
    import("@/components/ui/DataLoader").then((module) => module.PricesLoader),
  { ssr: false },
);
const WorldRiskLoader = dynamic(
  () =>
    import("@/components/ui/DataLoader").then(
      (module) => module.WorldRiskLoader,
    ),
  { ssr: false },
);
const MemorySpineSync = dynamic(
  () => import("@/components/ui/MemorySpineSync"),
  { ssr: false },
);
const CronSchedulerRunner = dynamic(
  () => import("@/components/ui/CronSchedulerRunner"),
  { ssr: false },
);

function CapabilityLoader({ capability }: { capability: ShellDataCapability }) {
  switch (capability) {
    case "articles":
      return <ArticlesLoader />;
    case "cves":
      return <CVEsLoader />;
    case "fearGreed":
      return <FearGreedLoader />;
    case "globalData":
      return <GlobalDataLoader />;
    case "prices":
      return <PricesLoader />;
    case "worldRisk":
      return <WorldRiskLoader />;
    case "otx":
      return null;
  }
}

export default function ShellBackgroundServices({
  pathname,
}: {
  pathname: string | null;
}) {
  const plan = useMemo(() => getShellPerformancePlan(pathname), [pathname]);
  const [deferredActive, setDeferredActive] = useState(false);

  useEffect(() => {
    if (deferredActive) return;
    const activate = () => setDeferredActive(true);
    const idleWindow = window as typeof window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
    };
    const idleHandle = idleWindow.requestIdleCallback?.(activate, {
      timeout: plan.deferTimeoutMs,
    });
    const timeoutHandle =
      idleHandle == null
        ? window.setTimeout(activate, plan.deferTimeoutMs)
        : null;

    window.addEventListener("pointerdown", activate, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", activate, { once: true });

    return () => {
      if (idleHandle != null) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle != null) window.clearTimeout(timeoutHandle);
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
    };
  }, [deferredActive, plan.deferTimeoutMs]);

  const activeCapabilities = deferredActive
    ? [...plan.immediate, ...plan.deferred]
    : plan.immediate;

  return (
    <>
      {activeCapabilities.map((capability) => (
        <CapabilityLoader key={capability} capability={capability} />
      ))}
      {deferredActive ? (
        <>
          <MemorySpineSync />
          <CronSchedulerRunner />
        </>
      ) : null}
    </>
  );
}
