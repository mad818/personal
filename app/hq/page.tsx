// ── hq/page ────────────────────────────────────────────────
// Canonical HQ route: live command shell, loaders, and ambient alerts.

import dynamic from "next/dynamic";
import OfficeCommandCenter from "@/components/home/office/OfficeCommandCenter";
import { ShellStage } from "@/components/ui/shell";
import {
  PricesLoader,
  FearGreedLoader,
  ArticlesLoader,
  CVEsLoader,
  WorldRiskLoader,
} from "@/components/ui/DataLoader";
import UIRulesEvaluator from "@/components/home/UIRulesEvaluator";

const DynamicAlerts = dynamic(
  () => import("@/components/home/DynamicAlerts").then((m) => ({ default: m.DynamicAlerts })),
  {
    ssr: false,
  },
);

export default function HQPage() {
  return (
    <ShellStage surface="hq">
      <PricesLoader />
      <FearGreedLoader />
      <ArticlesLoader />
      <CVEsLoader />
      <WorldRiskLoader />
      <UIRulesEvaluator />
      <DynamicAlerts />
      <OfficeCommandCenter />
    </ShellStage>
  );
}
