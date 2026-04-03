"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DeveloperFieldManual from "@/components/resources/DeveloperFieldManual";
import RegistryConsole from "@/components/resources/RegistryConsole";
import {
  SectionLabel,
  ShellGrid,
  ShellPanel,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useStore } from "@/store/useStore";

type View = "manual" | "registry" | "kits";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "manual", label: "Field Manual" },
  { id: "registry", label: "Registry" },
  { id: "kits", label: "Kits" },
];

export default function ResourcesWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = useStore((s) => s.resourcesWorkbenchView);
  const setView = useStore((s) => s.setResourcesWorkbenchView);

  const urlView = useMemo(() => {
    const value = (searchParams?.get("view") ?? "").toLowerCase();
    return value === "manual" || value === "registry" || value === "kits"
      ? (value as View)
      : null;
  }, [searchParams]);

  useEffect(() => {
    if (urlView) setView(urlView);
  }, [setView, urlView]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if ((params.get("view") ?? "").toLowerCase() === view) return;
    params.set("view", view);
    router.replace(`/resources?${params.toString()}`);
  }, [router, searchParams, view]);

  return (
    <ShellStack>
      <ShellSegmentedTabs items={VIEWS} active={view} onChange={setView} />

      {view === "manual" && (
        <ShellPanel>
          <SectionLabel detail="Searchable free/open reference deck">
            Developer field manual
          </SectionLabel>
          <DeveloperFieldManual />
        </ShellPanel>
      )}

      {view === "registry" && (
        <ShellGrid columns="minmax(280px, 0.34fr) minmax(0, 0.66fr)" align="start">
          <ShellPanel tone="muted">
            <SectionLabel>Registry posture</SectionLabel>
            <div className="nexus-shell-copy nexus-shell-copy--compact">
              This is the Shelf-style digital registry lane for tools, workflows,
              prompts, evidence packs, and doctrine references. Every item keeps
              cost posture, custody, and license context visible.
            </div>
          </ShellPanel>
          <ShellPanel>
            <SectionLabel detail="Tools, workflows, prompts, evidence">
              Registry console
            </SectionLabel>
            <RegistryConsole view="items" />
          </ShellPanel>
        </ShellGrid>
      )}

      {view === "kits" && (
        <ShellPanel>
          <SectionLabel detail="Reusable operator bundles">Registry kits</SectionLabel>
          <RegistryConsole view="kits" />
        </ShellPanel>
      )}
    </ShellStack>
  );
}
