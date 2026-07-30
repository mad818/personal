"use client";

import type { RefObject } from "react";
import type { ScheduledJob } from "@/store/useStore";
import CronSchedulerAuditFiltersSection from "@/components/ui/CronSchedulerAuditFiltersSection";
import CronSchedulerGovernanceStatusSection from "@/components/ui/CronSchedulerGovernanceStatusSection";
import CronSchedulerSavedViewsSection from "@/components/ui/CronSchedulerSavedViewsSection";
import {
  type SavedSchedulerAuditView,
  type SavedSchedulerAuditViewsImportPreview,
  type SchedulerAuditFilters,
} from "@/lib/schedulerGovernance";
import type { NativeBatchPostureState } from "@/components/ui/cronSchedulerPanelUtils";

interface Props {
  jobs: ScheduledJob[];
  nativeBatchPosture: NativeBatchPostureState;
  savedAuditViews: SavedSchedulerAuditView[];
  pendingImportedAuditViews: {
    views: SavedSchedulerAuditView[];
    summary: SavedSchedulerAuditViewsImportPreview;
  } | null;
  importSavedViewsInputRef: RefObject<HTMLInputElement | null>;
  showSaveAuditView: boolean;
  newAuditViewName: string;
  showPasteAuditViews: boolean;
  pastedAuditViewsText: string;
  auditFilters: SchedulerAuditFilters;
  hasActiveAuditFilters: boolean;
  auditMsg: string;
  onCopySchedulerAudit: () => void;
  onExportSchedulerAudit: () => void;
  onToggleSaveAuditView: () => void;
  onExportSavedAuditViews: () => void;
  onImportSavedAuditViewsClick: () => void;
  onTogglePasteAuditViews: () => void;
  onImportSavedAuditViewsFromFile: (file: File | null) => void;
  onPastedAuditViewsTextChange: (value: string) => void;
  onPreviewPastedAuditViewsImport: () => void;
  onApplyImportedSavedAuditViews: () => void;
  onCancelImportedSavedAuditViews: () => void;
  onNewAuditViewNameChange: (value: string) => void;
  onSaveCurrentAuditView: () => void;
  onApplySavedAuditView: (view: SavedSchedulerAuditView) => void;
  onRemoveSavedAuditView: (view: SavedSchedulerAuditView) => void;
  onSetAuditFilters: (
    next:
      | SchedulerAuditFilters
      | ((current: SchedulerAuditFilters) => SchedulerAuditFilters),
  ) => void;
}

export default function CronSchedulerGovernanceSection({
  jobs,
  nativeBatchPosture,
  savedAuditViews,
  pendingImportedAuditViews,
  importSavedViewsInputRef,
  showSaveAuditView,
  newAuditViewName,
  showPasteAuditViews,
  pastedAuditViewsText,
  auditFilters,
  hasActiveAuditFilters,
  auditMsg,
  onCopySchedulerAudit,
  onExportSchedulerAudit,
  onToggleSaveAuditView,
  onExportSavedAuditViews,
  onImportSavedAuditViewsClick,
  onTogglePasteAuditViews,
  onImportSavedAuditViewsFromFile,
  onPastedAuditViewsTextChange,
  onPreviewPastedAuditViewsImport,
  onApplyImportedSavedAuditViews,
  onCancelImportedSavedAuditViews,
  onNewAuditViewNameChange,
  onSaveCurrentAuditView,
  onApplySavedAuditView,
  onRemoveSavedAuditView,
  onSetAuditFilters,
}: Props) {
  return (
    <div
      style={{
        padding: "9px 12px",
        borderBottom: "1px solid #1A2040",
        display: "grid",
        gap: 8,
      }}
    >
      <CronSchedulerGovernanceStatusSection
        jobs={jobs}
        nativeBatchPosture={nativeBatchPosture}
        onCopySchedulerAudit={onCopySchedulerAudit}
        onExportSchedulerAudit={onExportSchedulerAudit}
      />
      <CronSchedulerSavedViewsSection
        savedAuditViews={savedAuditViews}
        pendingImportedAuditViews={pendingImportedAuditViews}
        importSavedViewsInputRef={importSavedViewsInputRef}
        showSaveAuditView={showSaveAuditView}
        newAuditViewName={newAuditViewName}
        showPasteAuditViews={showPasteAuditViews}
        pastedAuditViewsText={pastedAuditViewsText}
        auditFilters={auditFilters}
        onToggleSaveAuditView={onToggleSaveAuditView}
        onExportSavedAuditViews={onExportSavedAuditViews}
        onImportSavedAuditViewsClick={onImportSavedAuditViewsClick}
        onTogglePasteAuditViews={onTogglePasteAuditViews}
        onImportSavedAuditViewsFromFile={onImportSavedAuditViewsFromFile}
        onPastedAuditViewsTextChange={onPastedAuditViewsTextChange}
        onPreviewPastedAuditViewsImport={onPreviewPastedAuditViewsImport}
        onApplyImportedSavedAuditViews={onApplyImportedSavedAuditViews}
        onCancelImportedSavedAuditViews={onCancelImportedSavedAuditViews}
        onNewAuditViewNameChange={onNewAuditViewNameChange}
        onSaveCurrentAuditView={onSaveCurrentAuditView}
        onApplySavedAuditView={onApplySavedAuditView}
        onRemoveSavedAuditView={onRemoveSavedAuditView}
      />
      <CronSchedulerAuditFiltersSection
        auditFilters={auditFilters}
        hasActiveAuditFilters={hasActiveAuditFilters}
        auditMsg={auditMsg}
        onSetAuditFilters={onSetAuditFilters}
      />
    </div>
  );
}
