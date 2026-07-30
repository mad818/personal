"use client";

import type { Article } from "@/store/useStore";
import TrustOperationsRail from "@/components/ui/TrustOperationsRail";
import {
  OpsField,
  OpsInspector,
  OpsRail,
  OpsStrip,
  OpsWorkplane,
  ShellBadge,
  ShellStack,
} from "@/components/ui/shell";
import CompiledMemoryPagesPanel from "@/components/vault/CompiledMemoryPagesPanel";
import SavedArticles from "@/components/vault/SavedArticles";
import VaultExport from "@/components/vault/VaultExport";
import VaultStewardshipPanel from "@/components/vault/VaultStewardshipPanel";
import SecondBrainFileStatus from "@/components/vault/SecondBrainFileStatus";
import SecondBrainNightShiftWorkbench from "@/components/vault/SecondBrainNightShiftWorkbench";
import type { CompiledMemoryPageSummary } from "@/components/vault/vaultGraphPageUtils";

interface VaultPublishChamberProps {
  memoryBriefTitle: string;
  memoryBriefDetail: string;
  durableArtifactsTitle: string;
  durableArtifactsDetail: string;
  primarySignal: string;
  railClass: string;
  workplaneClass: string;
  inspectorClass: string;
  trustLabel: string;
  compiledPages: CompiledMemoryPageSummary[];
  savedArticles: Article[];
  compiledLoading: boolean;
  stewardExpanded: boolean;
  onStewardExpandedChange: (expanded: boolean) => void;
}

export default function VaultPublishChamber({
  memoryBriefTitle,
  memoryBriefDetail,
  durableArtifactsTitle,
  durableArtifactsDetail,
  primarySignal,
  railClass,
  workplaneClass,
  inspectorClass,
  trustLabel,
  compiledPages,
  savedArticles,
  compiledLoading,
  stewardExpanded,
  onStewardExpandedChange,
}: VaultPublishChamberProps) {
  return (
    <div id="vault-publish" style={{ scrollMarginTop: "120px" }}>
      <div className="nexus-surface-chamber-shell">
        <div className="nexus-surface-chamber-shell__body">
          <OpsRail
            className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${railClass}`}
          >
            <ShellStack gap="12px">
              <OpsField
                title={memoryBriefTitle}
                detail={memoryBriefDetail}
                tone="muted"
                compact
              >
                <div className="nexus-shell-copy nexus-shell-copy--compact">
                  Publish mode is where durable notes get promoted, repaired,
                  bundled, and exported. Stewardship and trust posture stay
                  visible here so export does not outrun archive health.
                </div>
                <div
                  className="nexus-vault-rail-preview"
                  aria-label="Publish rail preview"
                >
                  <span>{primarySignal}</span>
                  <span>{compiledPages.length} pages</span>
                  <span>{savedArticles.length} clips</span>
                </div>
                <div className="nexus-shell-actions">
                  <ShellBadge tone="accent">
                    {compiledPages.length} pages
                  </ShellBadge>
                  <ShellBadge tone="muted">
                    {savedArticles.length} clips
                  </ShellBadge>
                  <ShellBadge tone="muted">
                    {compiledLoading ? "Refreshing" : "Archive ready"}
                  </ShellBadge>
                </div>
              </OpsField>
              <TrustOperationsRail
                title={trustLabel}
                detail="Promotion, export, and protected archive writes stay inline with durable publishing."
                compact
              />
              <OpsField
                title="Stewardship"
                detail="Durable archive repair and readiness"
                tone="muted"
                compact
              >
                <details
                  className="nexus-surface-disclosure"
                  open={stewardExpanded}
                  onToggle={(event) =>
                    onStewardExpandedChange(event.currentTarget.open)
                  }
                >
                  <summary>Open stewardship detail</summary>
                  <div className="nexus-surface-disclosure__body">
                    <VaultStewardshipPanel compiledPages={compiledPages} />
                  </div>
                </details>
              </OpsField>
            </ShellStack>
          </OpsRail>

          <OpsWorkplane
            className={`nexus-surface-chamber-shell__lead ${workplaneClass}`}
          >
            <OpsField
              title={durableArtifactsTitle}
              detail={durableArtifactsDetail}
            >
              <div className="nexus-shell-copy nexus-shell-copy--compact">
                Promote, repair, and reuse durable archive outputs without
                leaving the active publishing lane.
              </div>
              <div style={{ marginTop: "14px" }}>
                <SecondBrainNightShiftWorkbench />
              </div>
              <div style={{ marginTop: "14px" }}>
                <SecondBrainFileStatus />
              </div>
              <div style={{ marginTop: "14px" }}>
                <CompiledMemoryPagesPanel />
              </div>
            </OpsField>
          </OpsWorkplane>
        </div>

        <div
          id="vault-export-second-brain"
          className="nexus-surface-continuity-strip"
          style={{ scrollMarginTop: "120px" }}
        >
          <OpsStrip className="nexus-motion-enter nexus-motion-enter--continuity">
            <div className="nexus-surface-chamber-shell__body">
              <div className="nexus-surface-chamber-shell__lead">
                <OpsField
                  title="Export archive bundles"
                  detail="JSON and second-brain continuity outputs"
                  tone="muted"
                >
                  <VaultExport compiledPages={compiledPages} />
                </OpsField>
              </div>
              <OpsInspector
                className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${inspectorClass}`}
              >
                <OpsField
                  title="Saved article archive"
                  detail="Durable clip backlog close to export"
                  tone="muted"
                  compact
                >
                  <SavedArticles />
                </OpsField>
              </OpsInspector>
            </div>
          </OpsStrip>
        </div>
      </div>
    </div>
  );
}
