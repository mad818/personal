// ── alpha/page.tsx ──────────────────────────────────────────
// MARKETS tab: crypto prices, scanner flows, sizing, and charts.

"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import WatchlistManager from "@/components/alpha/WatchlistManager";
import { PricesLoader } from "@/components/ui/DataLoader";
import SurfaceFocusStrip from "@/components/ui/SurfaceFocusStrip";
import {
  OpsField,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
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
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
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
  const alphaLayout = getOpsLayoutDescriptor("alpha");

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
        <OpsField
          title="Market review"
          detail="Thesis continuity and post-trade reflection"
          tone="muted"
          compact
        >
          <LazyMarketReviewCard />
        </OpsField>
      </div>
      <OpsField
        title={forecastLabSpec.title}
        detail={forecastLabSpec.detail}
        tone="muted"
        compact
      >
        <LazyForecastLabCard />
      </OpsField>
    </>
  );

  return (
    <ShellPage
      surface="alpha"
      eyebrow="Market picture"
      title="Market desk"
      description="Watchlists, setups, and sizing on one market desk."
      actions={
        <>
          <ShellBadge tone="accent">Execution support</ShellBadge>
          <ShellBadge tone="success">Tape continuity</ShellBadge>
        </>
      }
    >
      <PricesLoader />

      <ShellStack>
        <OpsStrip className="nexus-surface-route-strip">
          <div className="nexus-surface-route-strip__grid">
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Watchlist
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {watchlist.length}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Tracked names stay persistent while the active chamber changes.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Active chamber
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {chamber === "tape" ? "Tape" : chamber}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Use one market posture strip instead of repeating brief copy in
                every view.
              </span>
            </div>
            <div className="nexus-surface-route-strip__cell">
              <span className="nexus-surface-route-strip__cellLabel">
                Tape mode
              </span>
              <strong className="nexus-surface-route-strip__cellValue">
                {tapeView === "charts" ? "Charts" : "Grid"}
              </strong>
              <span className="nexus-surface-route-strip__cellNote">
                Prices and charts now share one verification chamber while old
                deep links still resolve.
              </span>
            </div>
          </div>
        </OpsStrip>

        {focus === "alpha-watchlist" ? (
          <SurfaceFocusStrip
            title="Focused session: watchlist"
            description="Watchlist opens first."
          />
        ) : null}

        {focus === "alpha-market-review" ? (
          <SurfaceFocusStrip
            title="Focused session: market review"
            description="Market review opens first."
          />
        ) : null}

        {focus === "alpha-signals" ? (
          <SurfaceFocusStrip
            title="Focused session: signal engine"
            description="Signals open first."
          />
        ) : null}

        {focus === "alpha-scanner" ? (
          <SurfaceFocusStrip
            title="Focused session: momentum scanner"
            description="Scanner opens first."
          />
        ) : null}

        {focus === "alpha-sizer" ? (
          <SurfaceFocusStrip
            title="Focused session: position sizer"
            description="Sizing opens first."
          />
        ) : null}

        {focus === "alpha-prices" ? (
          <SurfaceFocusStrip
            title="Focused session: price grid"
            description="Market grid opens first."
          />
        ) : null}

        {focus === "alpha-charts" ? (
          <SurfaceFocusStrip
            title="Focused session: charts"
            description="Chart opens first."
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
            <OpsWorkplane className={alphaLayout.workplaneClass}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <OpsField
                    title="Watchlist manager"
                    detail="Where the tape stands now"
                  >
                    <WatchlistManager />
                  </OpsField>
                </div>
                <OpsRail
                  className={`nexus-surface-chamber-shell__support ${alphaLayout.railClass}`}
                >
                  {renderSupportRail()}
                  <OpsField
                    title="Sparklines"
                    detail="Tracked seven-day motion"
                    tone="muted"
                  >
                    <LazyPriceSparklines />
                  </OpsField>
                </OpsRail>
              </div>
            </OpsWorkplane>
          </div>
        )}

        {chamber === "signals" && (
          <div id="alpha-signals" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={alphaLayout.workplaneClass}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <OpsField
                    title="Signal engine"
                    detail="Inspect the strongest setup first"
                  >
                    <LazyBuyBot />
                  </OpsField>
                </div>
                <OpsRail
                  className={`nexus-surface-chamber-shell__support ${alphaLayout.railClass}`}
                >
                  {renderSupportRail()}
                  <OpsField
                    title="Market brief"
                    detail="Carry the watchlist posture into the setup lane"
                    tone="muted"
                    compact
                  >
                    <div className="nexus-shell-copy nexus-shell-copy--compact">
                      The signal engine stays primary here; use the watchlist
                      and tape chamber only when the setup needs broader
                      verification.
                    </div>
                  </OpsField>
                </OpsRail>
              </div>
            </OpsWorkplane>
          </div>
        )}

        {chamber === "scanner" && (
          <div id="alpha-scanner" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={alphaLayout.workplaneClass}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <OpsField
                    title="Momentum scanner"
                    detail="Which names deserve attention"
                  >
                    <LazyMomentumScanner />
                  </OpsField>
                </div>
                <OpsRail
                  className={`nexus-surface-chamber-shell__support ${alphaLayout.railClass}`}
                >
                  {renderSupportRail()}
                </OpsRail>
              </div>
            </OpsWorkplane>
          </div>
        )}

        {chamber === "sizer" && (
          <div id="alpha-sizer" style={{ scrollMarginTop: "120px" }}>
            <OpsWorkplane className={alphaLayout.workplaneClass}>
              <div className="nexus-surface-chamber-shell__body">
                <div className="nexus-surface-chamber-shell__lead">
                  <OpsField
                    title="Position sizer"
                    detail="Size the trade before you act"
                  >
                    <LazyPositionSizer />
                  </OpsField>
                </div>
                <OpsRail
                  className={`nexus-surface-chamber-shell__support ${alphaLayout.railClass}`}
                >
                  {renderSupportRail()}
                </OpsRail>
              </div>
            </OpsWorkplane>
          </div>
        )}

        {chamber === "tape" && (
          <div
            id={tapeView === "charts" ? "alpha-charts" : "alpha-prices"}
            style={{ scrollMarginTop: "120px" }}
          >
            <OpsWorkplane className={alphaLayout.workplaneClass}>
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
                      <OpsField
                        title="Price grid"
                        detail="Verify the broad tape first"
                      >
                        <LazyPriceGrid />
                      </OpsField>
                    ) : (
                      <OpsField
                        title="Charts"
                        detail="Visual follow-through before execution"
                      >
                        <LazyTradingViewMarkets />
                      </OpsField>
                    )}
                  </div>
                </div>
                <OpsRail
                  className={`nexus-surface-chamber-shell__support ${alphaLayout.railClass}`}
                >
                  {renderSupportRail()}
                </OpsRail>
              </div>
            </OpsWorkplane>
          </div>
        )}
      </ShellStack>
    </ShellPage>
  );
}
