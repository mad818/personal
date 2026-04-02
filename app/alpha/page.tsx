// ── alpha/page.tsx ──────────────────────────────────────────
// MARKETS tab: crypto prices, scanner flows, sizing, and charts.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import WatchlistManager from "@/components/alpha/WatchlistManager";
import { PricesLoader } from "@/components/ui/DataLoader";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useStore } from "@/store/useStore";

type MarketsView =
  | "watchlist"
  | "signals"
  | "scanner"
  | "sizer"
  | "prices"
  | "charts";

const VIEWS: Array<{ id: MarketsView; label: string }> = [
  { id: "watchlist", label: "⭐ WATCHLIST" },
  { id: "signals", label: "🤖 SIGNALS" },
  { id: "scanner", label: "📈 SCANNER" },
  { id: "sizer", label: "🎯 SIZER" },
  { id: "prices", label: "💱 PRICES" },
  { id: "charts", label: "📺 CHARTS" },
];

const LazyPriceGrid = dynamic(() => import("@/components/alpha/PriceGrid"), {
  ssr: false,
});
const LazyMomentumScanner = dynamic(
  () => import("@/components/alpha/MomentumScanner"),
  { ssr: false },
);
const LazyBuyBot = dynamic(() => import("@/components/alpha/BuyBot"), {
  ssr: false,
});
const LazyPositionSizer = dynamic(
  () => import("@/components/alpha/PositionSizer"),
  { ssr: false },
);
const LazyPriceSparklines = dynamic(
  () => import("@/components/alpha/PriceSparklines"),
  { ssr: false },
);
const LazyTradingViewMarkets = dynamic(
  () => import("@/components/alpha/TradingViewMarkets"),
  { ssr: false },
);

export default function AlphaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = useStore((s) => s.marketsView) ?? "watchlist";
  const setView = useStore((s) => s.setMarketsView);

  const urlView = useMemo(() => {
    const v = (searchParams?.get("view") ?? "").toLowerCase();
    return (
      [
        "watchlist",
        "signals",
        "scanner",
        "sizer",
        "prices",
        "charts",
      ] as MarketsView[]
    ).includes(v as MarketsView)
      ? (v as MarketsView)
      : null;
  }, [searchParams]);

  useEffect(() => {
    if (!urlView) return;
    setView(urlView);
  }, [urlView, setView]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if ((params.get("view") ?? "").toLowerCase() === view) return;
    params.set("view", view);
    router.replace(`/alpha?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <ShellPage
      eyebrow="Markets and decision support"
      title="ALPHA"
      description="A cleaner trading workspace for watchlists, momentum scans, price context, and risk sizing."
      actions={
        <>
          <ShellBadge tone="accent">Decision support</ShellBadge>
          <ShellBadge tone="success">Free public data</ShellBadge>
        </>
      }
    >
      <PricesLoader />

      <ShellStack>
        <ShellSegmentedTabs items={VIEWS} active={view} onChange={setView} minButtonWidth={120} />

        {view === "watchlist" && (
          <ShellGrid columns="minmax(0, 1fr) minmax(320px, 0.95fr)" align="start">
            <ShellPanel>
              <SectionLabel>Watchlist manager</SectionLabel>
              <WatchlistManager />
            </ShellPanel>
            <ShellPanel tone="muted">
              <SectionLabel detail="Tracked 7-day motion">Sparklines</SectionLabel>
              <LazyPriceSparklines />
            </ShellPanel>
          </ShellGrid>
        )}

        {view === "signals" && (
          <ShellPanel>
            <SectionLabel detail="Buy / sell signal board">Signal engine</SectionLabel>
            <LazyBuyBot />
          </ShellPanel>
        )}

        {view === "scanner" && (
          <ShellPanel>
            <SectionLabel detail="Momentum and setup detection">Momentum scanner</SectionLabel>
            <LazyMomentumScanner />
          </ShellPanel>
        )}

        {view === "sizer" && (
          <ShellPanel>
            <SectionLabel detail="Fixed risk and Kelly sizing">Position sizer</SectionLabel>
            <LazyPositionSizer />
          </ShellPanel>
        )}

        {view === "prices" && (
          <ShellPanel>
            <SectionLabel detail="Top-level market overview">Price grid</SectionLabel>
            <LazyPriceGrid />
          </ShellPanel>
        )}

        {view === "charts" && (
          <ShellPanel>
            <SectionLabel detail="Legacy TradingView embeds">Charts</SectionLabel>
            <LazyTradingViewMarkets />
          </ShellPanel>
        )}
      </ShellStack>
    </ShellPage>
  );
}
