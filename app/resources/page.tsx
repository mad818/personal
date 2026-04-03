import type { Metadata } from "next";
import {
  DEVELOPER_RESOURCE_CATEGORIES,
  DEVELOPER_RESOURCES,
  type ResourceCategory,
} from "@/lib/developerResources";
import ResourcesWorkbench from "@/components/resources/ResourcesWorkbench";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellStack,
} from "@/components/ui/shell";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Field Manual | ${BRAND_NAME}`,
  description:
    "Curated external resources for operator study, tooling, ecosystem mapping, and research skills inside the Aegis Vector field manual.",
};

const CATEGORY_ORDER: ResourceCategory[] = [
  "certification",
  "study",
  "tooling",
  "ecosystem",
];

export default function ResourcesPage() {
  const counts = DEVELOPER_RESOURCES.reduce<Record<ResourceCategory, number>>(
    (acc, resource) => {
      acc[resource.category] = (acc[resource.category] ?? 0) + 1;
      return acc;
    },
    {
      certification: 0,
      study: 0,
      tooling: 0,
      ecosystem: 0,
    },
  );

  return (
    <ShellPage
      width="wide"
      surface="resources"
      eyebrow="Operator schematic deck"
      title="Field manual"
      description="Curated GitHub resources for certification prep, interviews, fundamentals, and agent tooling inside the same shell as the rest of Aegis Vector."
      actions={
        <>
          <ShellBadge tone="accent">Curated references</ShellBadge>
          <ShellBadge tone="muted">External links only</ShellBadge>
        </>
      }
    >
      <ShellGrid columns="minmax(260px, 0.3fr) minmax(0, 0.7fr)" align="start">
        <ShellStack>
          <ShellPanel tone="hero">
            <SectionLabel>Use this page for</SectionLabel>
            <div className="nexus-shell-copy">
              <p>
                Certification prep, interview depth, research workflows, and
                IDE-side agent tooling, all framed inside the same cinematic
                shell instead of dropping back to a plain utility page.
              </p>
              <ul className="nexus-shell-kicker-list" aria-label="Field manual uses">
                <li>Map the ecosystem before adopting a new workflow or tool.</li>
                <li>Keep free-first references close while preserving BYOK boundaries.</li>
                <li>Separate product surfaces from external study depth.</li>
              </ul>
            </div>
          </ShellPanel>
          <ShellPanel tone="muted">
            <SectionLabel>Operator reminder</SectionLabel>
            <div className="nexus-shell-copy nexus-shell-copy--compact">
              Prefer official vendor docs for pricing, auth, and data handling, and never paste production secrets into third-party tools without checking their data-flow posture first.
            </div>
          </ShellPanel>
          <ShellPanel>
            <SectionLabel detail="What lives here">Coverage snapshot</SectionLabel>
            <div className="nexus-shell-stat-grid">
              {CATEGORY_ORDER.map((category) => (
                <div
                  key={category}
                  className="nexus-shell-stat-card"
                  data-tone={category}
                >
                  <span className="nexus-shell-stat-card__value">
                    {counts[category]}
                  </span>
                  <span className="nexus-shell-stat-card__label">
                    {DEVELOPER_RESOURCE_CATEGORIES[category]}
                  </span>
                </div>
              ))}
            </div>
          </ShellPanel>
        </ShellStack>

        <ShellPanel>
          <SectionLabel detail="Manual, registry, and kit views">
            Resources workbench
          </SectionLabel>
          <ResourcesWorkbench />
        </ShellPanel>
      </ShellGrid>
    </ShellPage>
  );
}
