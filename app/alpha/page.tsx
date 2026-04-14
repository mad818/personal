// ── alpha/page.tsx ──────────────────────────────────────────
// MARKETS tab: crypto prices, scanner flows, sizing, and charts.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import WatchlistManager from "@/components/alpha/WatchlistManager";
import { PricesLoader } from "@/components/ui/DataLoader";
import SurfaceModuleCard from "@/components/ui/SurfaceModuleCard";
import SurfaceModuleSection from "@/components/ui/SurfaceModuleSection";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  ShellBadge,
  ShellPage,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import {
  resolveAlphaChamber,
  resolveAlphaTapeView,
  type AlphaChamberId,
} from "@/lib/surfaceCondensationRegistry";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import { useSurfaceFocusScroll } from "@/hooks/useSurfaceFocusScroll";
import { getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { useStore } from "@/store/useStore";

type MarketsView =
  | "watchlist"
  | "signals"
  | "scanner"
  | "sizer"
  | "prices"
  | "charts";

const CHAMBER_VIEWS: Array<{ id: AlphaChamberId; label: string }> = [
  { id: "watchlist", label: "⭐ WATCHLIST" },
  { id: "signals", label: "🤖 SIGNALS" },
  { id: "scanner", label: "📈 SCANNER" },
  { id: "sizer", label: "🎯 SIZER" },
  { id: "tape", label: "💱 MARKET TAPE" },
];

const TAPE_VIEWS: Array<{ id: "prices" | "charts"; label: string }> = [
  { id: "prices", label: "Grid" },
  { id: "charts", label: "Charts" },
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
const LazyForecastLabCard = dynamic(
  () => import("@/components/alpha/ForecastLabCard"),
  { ssr: false },
);
const LazyMarketReviewCard = dynamic(
  () => import("@/components/alpha/MarketReviewCard"),
  { ssr: false },
);

export default function AlphaPage() {
  const router = useRouter();
  const { normalizedParams } = useSessionHrefAutoHeal();
  const focus = normalizedParams.get("focus");
  const view = useStore((s) => s.marketsView) ?? "watchlist";
  const setView = useStore((s) => s.setMarketsView);
  const watchlist = useStore((s) => s.settings.watchlist);

  const urlView = useMemo(() => {
    const v = (normalizedParams.get("view") ?? "").toLowerCase();
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
  }, [normalizedParams]);

  const focusView = useMemo(() => {
    if (focus === "alpha-watchlist") return "watchlist";
    if (focus === "alpha-market-review") return "watchlist";
    if (focus === "alpha-signals") return "signals";
    if (focus === "alpha-scanner") return "scanner";
    if (focus === "alpha-sizer") return "sizer";
    if (focus === "alpha-prices") return "prices";
    if (focus === "alpha-charts") return "charts";
    return null;
  }, [focus]);

  const chamber = useMemo(() => resolveAlphaChamber(view), [view]);
  const tapeView = useMemo(() => resolveAlphaTapeView(view), [view]);

  useEffect(() => {
    const nextView = focusView ?? urlView;
    if (!nextView) return;
    setView(nextView);
  }, [focusView, setView, urlView]);

  const handleChamberChange = (nextView: AlphaChamberId) => {
    const targetView = nextView === "tape" ? "prices" : nextView;
    setView(targetView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", targetView);
    router.replace(`/alpha?${params.toString()}`);
  };

  const handleTapeViewChange = (nextView: "prices" | "charts") => {
    setView(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/alpha?${params.toString()}`);
  };

  const focusTargetId =
    focus === "alpha-watchlist"
      ? "alpha-watchlist"
      : focus === "alpha-market-review"
        ? "alpha-market-review"
      : focus === "alpha-signals"
        ? "alpha-signals"
        : focus === "alpha-scanner"
          ? "alpha-scanner"
          : focus === "alpha-sizer"
            ? "alpha-sizer"
            : focus === "alpha-prices"
              ? "alpha-prices"
              : focus === "alpha-charts"
                ? "alpha-charts"
                : null;

  useSurfaceFocusScroll(focusTargetId);

  const marketBriefSpec = getSurfaceModuleSpec("alpha", "market-brief");
  const setupsSpec = getSurfaceModuleSpec("alpha", "setups");
  const momentumSpec = getSurfaceModuleSpec("alpha", "momentum");
  const riskPlanSpec = getSurfaceModuleSpec("alpha", "risk-plan");
  const marketTapeSpec = getSurfaceModuleSpec("alpha", "market-tape", view);
  const forecastLabSpec = getSurfaceModuleSpec("alpha", "forecast-lab");

  if (
    !marketBriefSpec ||
    !setupsSpec ||
    !momentumSpec ||
    !riskPlanSpec ||
    !marketTapeSpec ||
    !forecastLabSpec
  ) {
    return null;
  }

  const renderSupportRail = () => (
    <>
      <div id="alpha-market-review" style={{ scrollMarginTop: "120px" }}>
        <SurfaceModuleSection
          title="Market review"
          detail="Thesis continuity and post-trade reflection"
          tone="muted"
          compact
        >
          <LazyMarketReviewCard />
        </SurfaceModuleSection>
      </div>
      <SurfaceModuleSection
        title={forecastLabSpec.title}
        detail={forecastLabSpec.detail}
        tone="muted"
        compact
      >
        <LazyForecastLabCard />
      </SurfaceModuleSection>
    </>
  );

  return (
    <ShellPage
      surface="alpha"
      eyebrow="Execution lattice"
      title="QUANT"
      description="A fast trading lattice for watchlists, momentum scans, price context, and risk sizing without paid data dependence."
      actions={
        <>
          <ShellBadge tone="accent">Execution support</ShellBadge>
          <ShellBadge tone="success">Free public data</ShellBadge>
        </>
      }
    >
      <PricesLoader />

      <ShellStack>
        <SurfaceModuleCard
          spec={marketBriefSpec}
          tone="muted"
          compact
          className="nexus-surface-route-strip"
        >
          <div className="nexus-surface-route-strip__grid">
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Watchlist</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {watchlist.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Tracked names stay persistent while the active chamber changes.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Active chamber</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {chamber === "tape" ? "Tape" : chamber}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Use one market posture strip instead of repeating brief copy in every view.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">Tape mode</span>
              <strong className="nexus-surface-route-strip__cellValue">
                {tapeView === "charts" ? "Charts" : "Grid"}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Prices and charts now share one verification chamber while old deep links still resolve.
              </span>
            </div>
          </div>
        </SurfaceModuleCard>

        {focus === "alpha-watchlist" ? (
          <SurfaceFocusStrip
            title="Focused session: watchlist"
            description="You landed on ALPHA with the watchlist lane in focus so tracked assets and short-motion context show up first."
          />
        ) : null}

        {focus === "alpha-market-review" ? (
          <SurfaceFocusStrip
            title="Focused session: market review"
            description="You landed on ALPHA with the market-review lane in focus so thesis continuity, prior setups, and a fresh governed review entry are ready before broader tape browsing."
          />
        ) : null}

        {focus === "alpha-signals" ? (
          <SurfaceFocusStrip
            title="Focused session: signal engine"
            description="You landed on ALPHA with the signal engine in focus so directional posture is visible before broader market browsing."
          />
        ) : null}

        {focus === "alpha-scanner" ? (
          <SurfaceFocusStrip
            title="Focused session: momentum scanner"
            description="You landed on ALPHA with the scanner in focus so setup triage starts at the right panel."
          />
        ) : null}

        {focus === "alpha-sizer" ? (
          <SurfaceFocusStrip
            title="Focused session: position sizer"
            description="You landed on ALPHA with the sizing lane in focus so risk sizing can happen without extra clicks."
          />
        ) : null}

        {focus === "alpha-prices" ? (
          <SurfaceFocusStrip
            title="Focused session: price grid"
            description="You landed on ALPHA with the broad market-overview grid in focus."
          />
        ) : null}

        {focus === "alpha-charts" ? (
          <SurfaceFocusStrip
            title="Focused session: charts"
            description="You landed on ALPHA with the chart lane in focus so visual follow-through starts on the correct panel."
          />
        ) : null}

        <ShellSegmentedTabs
          items={CHAMBER_VIEWS}
          active={chamber}
          onChange={handleChamberChange}
          minButtonWidth={120}
        />

        {chamber === "watchlist" && (
          <div id="alpha-watchlist" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={marketBriefSpec} tone="hero">
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <SurfaceModuleSection title="Watchlist manager" detail="Where the tape stands now">
                    <WatchlistManager />
                  </SurfaceModuleSection>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  {renderSupportRail()}
                  <SurfaceModuleSection title="Sparklines" detail="Tracked seven-day motion" tone="muted">
                    <LazyPriceSparklines />
                  </SurfaceModuleSection>
                </div>
              </div>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "signals" && (
          <div id="alpha-signals" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={setupsSpec} tone="hero">
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <SurfaceModuleSection title="Signal engine" detail="Inspect the strongest setup first">
                    <LazyBuyBot />
                  </SurfaceModuleSection>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  {renderSupportRail()}
                  <SurfaceModuleSection
                    title="Market brief"
                    detail="Carry the watchlist posture into the setup lane"
                    tone="muted"
                    compact
                  >
                    <div className="nexus-shell-copy nexus-shell-copy--compact">
                      The signal engine stays primary here; use the watchlist and tape chamber only when the setup needs broader verification.
                    </div>
                  </SurfaceModuleSection>
                </div>
              </div>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "scanner" && (
          <div id="alpha-scanner" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={momentumSpec}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <SurfaceModuleSection title="Momentum scanner" detail="Which names deserve attention">
                    <LazyMomentumScanner />
                  </SurfaceModuleSection>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  {renderSupportRail()}
                </div>
              </div>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "sizer" && (
          <div id="alpha-sizer" style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={riskPlanSpec}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <SurfaceModuleSection title="Position sizer" detail="Size the trade before you act">
                    <LazyPositionSizer />
                  </SurfaceModuleSection>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  {renderSupportRail()}
                </div>
              </div>
            </SurfaceModuleCard>
          </div>
        )}

        {chamber === "tape" && (
          <div id={tapeView === "charts" ? "alpha-charts" : "alpha-prices"} style={{ scrollMarginTop: "120px" }}>
            <SurfaceModuleCard spec={marketTapeSpec}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <div className="nexus-surface-subtabs">
                    <ShellSegmentedTabs
                      items={TAPE_VIEWS}
                      active={tapeView}
                      onChange={handleTapeViewChange}
                      minButtonWidth={110}
                    />
                    {tapeView === "prices" ? (
                      <SurfaceModuleSection title="Price grid" detail="Verify the broad tape first">
                        <LazyPriceGrid />
                      </SurfaceModuleSection>
                    ) : (
                      <SurfaceModuleSection title="Charts" detail="Visual follow-through before execution">
                        <LazyTradingViewMarkets />
                      </SurfaceModuleSection>
                    )}
                  </div>
                </div>
                <div className="nexus-surface-chamber-shell__support">
                  {renderSupportRail()}
                </div>
              </div>
            </SurfaceModuleCard>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
