import type { Metadata } from "next";
import ResourcesWorkbench from "@/components/resources/ResourcesWorkbench";
import { ShellBadge, ShellPage } from "@/components/ui/shell";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Field Manual | ${BRAND_NAME}`,
  description:
    "Curated external resources plus a fast local finder, seeded working-context jumps, internal playbooks, spec-first starters, surface audits, architecture maps, impact analysis, and exact repair sessions inside the Homefront field manual.",
};

export default function ResourcesPage() {
  return (
    <ShellPage
      width="wide"
      surface="resources"
      eyebrow="Reference deck"
      title="Reference desk"
      description="References and playbooks."
      actions={
        <>
          <ShellBadge tone="accent">Curated references</ShellBadge>
          <ShellBadge tone="muted">Surface audit</ShellBadge>
          <ShellBadge tone="muted">External links only</ShellBadge>
        </>
      }
    >
      <ResourcesWorkbench />
    </ShellPage>
  );
}
