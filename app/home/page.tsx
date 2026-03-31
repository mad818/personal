// ── home/page ───────────────────────────────────────────────
// Home page: landing view with ambient charts and navigation.

import OfficeCommandCenter from "@/components/home/office/OfficeCommandCenter";
import {
  PricesLoader,
  FearGreedLoader,
  ArticlesLoader,
  CVEsLoader,
  WorldRiskLoader,
} from "@/components/ui/DataLoader";

export default function HomePage() {
  return (
    <>
      <PricesLoader />
      <FearGreedLoader />
      <ArticlesLoader />
      <CVEsLoader />
      <WorldRiskLoader />
      <OfficeCommandCenter />
    </>
  );
}
