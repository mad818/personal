"use client";

import type { RefObject } from "react";
import { takeSelectedFile } from "@/components/ui/fileInput";
import {
  areSchedulerAuditFiltersEqual,
  MAX_SAVED_SCHEDULER_AUDIT_VIEWS,
  type SavedSchedulerAuditView,
  type SavedSchedulerAuditViewsImportPreview,
  type SchedulerAuditFilters,
} from "@/lib/schedulerGovernance";

interface Props {
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
}

export default function CronSchedulerSavedViewsSection({
  savedAuditViews,
  pendingImportedAuditViews,
  importSavedViewsInputRef,
  showSaveAuditView,
  newAuditViewName,
  showPasteAuditViews,
  pastedAuditViewsText,
  auditFilters,
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
}: Props) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onToggleSaveAuditView}
          style={{
            borderRadius: 6,
            border: "1px solid rgba(79,110,247,.3)",
            background: "rgba(79,110,247,.08)",
            color: "#9fb7ff",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {showSaveAuditView ? "Cancel save" : "Save current view"}
        </button>
        {savedAuditViews.length ? (
          <button
            type="button"
            onClick={onExportSavedAuditViews}
            style={{
              borderRadius: 6,
              border: "1px solid #1A2040",
              background: "#0a1120",
              color: "#cbd5e1",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            Export views
          </button>
        ) : null}
        <button
          type="button"
          onClick={onImportSavedAuditViewsClick}
          style={{
            borderRadius: 6,
            border: "1px solid #1A2040",
            background: "#0a1120",
            color: "#cbd5e1",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          Import views
        </button>
        <button
          type="button"
          onClick={onTogglePasteAuditViews}
          style={{
            borderRadius: 6,
            border: "1px solid #1A2040",
            background: "#0a1120",
            color: "#cbd5e1",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {showPasteAuditViews ? "Cancel paste" : "Paste JSON"}
        </button>
        <input
          aria-label="Import saved scheduler audit views"
          ref={importSavedViewsInputRef}
          type="file"
          accept=".json,application/json"
          onChange={(event) =>
            onImportSavedAuditViewsFromFile(
              takeSelectedFile(event.currentTarget),
            )
          }
          style={{ display: "none" }}
        />
      </div>

      {showPasteAuditViews ? (
        <div style={{ display: "grid", gap: 8 }}>
          <textarea
            aria-label="Pasted scheduler audit views JSON"
            value={pastedAuditViewsText}
            onChange={(event) => onPastedAuditViewsTextChange(event.target.value)}
            placeholder="Paste a saved audit view JSON export here"
            rows={5}
            style={{
              width: "100%",
              resize: "vertical",
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: 8,
              color: "#ccd6f6",
              padding: "8px 10px",
              fontSize: 10,
              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onPreviewPastedAuditViewsImport}
              style={{
                borderRadius: 6,
                border: "1px solid rgba(0,221,255,.35)",
                background: "rgba(0,221,255,.1)",
                color: "#00DDFF",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Preview pasted import
            </button>
            <span style={{ color: "#6875a0", fontSize: 10 }}>
              Uses the same validated preview and merge flow as file imports.
            </span>
          </div>
        </div>
      ) : null}

      {pendingImportedAuditViews ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,221,255,.18)",
            background: "rgba(8,17,32,.78)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#00DDFF", fontWeight: 700, fontSize: 10 }}>
              Import preview
            </span>
            <span style={{ color: "#6875a0", fontSize: 10 }}>
              {pendingImportedAuditViews.summary.incomingCount} incoming
            </span>
            <span style={{ color: "#6875a0", fontSize: 10 }}>
              {pendingImportedAuditViews.summary.newCount} new
            </span>
            <span style={{ color: "#6875a0", fontSize: 10 }}>
              {pendingImportedAuditViews.summary.replacementCount} replace existing
            </span>
            {pendingImportedAuditViews.summary.trimmedCount ? (
              <span style={{ color: "#fbbf24", fontSize: 10 }}>
                {pendingImportedAuditViews.summary.trimmedCount} oldest removed by cap
              </span>
            ) : null}
          </div>
          {pendingImportedAuditViews.summary.replacementNames.length ? (
            <div style={{ color: "#ccd6f6", fontSize: 10 }}>
              Replaces: {pendingImportedAuditViews.summary.replacementNames.join(", ")}
            </div>
          ) : null}
          {pendingImportedAuditViews.summary.newNames.length ? (
            <div style={{ color: "#9fb7ff", fontSize: 10 }}>
              Adds: {pendingImportedAuditViews.summary.newNames.join(", ")}
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onApplyImportedSavedAuditViews}
              style={{
                borderRadius: 6,
                border: "1px solid rgba(0,221,255,.35)",
                background: "rgba(0,221,255,.1)",
                color: "#00DDFF",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Apply import
            </button>
            <button
              type="button"
              onClick={onCancelImportedSavedAuditViews}
              style={{
                borderRadius: 6,
                border: "1px solid #1A2040",
                background: "#0a1120",
                color: "#cbd5e1",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Cancel import
            </button>
          </div>
        </div>
      ) : null}

      {showSaveAuditView ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            aria-label="Saved scheduler audit view name"
            value={newAuditViewName}
            onChange={(event) => onNewAuditViewNameChange(event.target.value)}
            placeholder="Saved audit view name"
            maxLength={32}
            style={{
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: 6,
              color: "#ccd6f6",
              padding: "4px 8px",
              fontSize: 10,
              minWidth: 180,
            }}
          />
          <button
            type="button"
            onClick={onSaveCurrentAuditView}
            style={{
              borderRadius: 6,
              border: "1px solid rgba(0,221,255,.35)",
              background: "rgba(0,221,255,.1)",
              color: "#00DDFF",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            Save view
          </button>
          <span style={{ color: "#6875a0", fontSize: 10 }}>
            Up to {MAX_SAVED_SCHEDULER_AUDIT_VIEWS} named local views.
          </span>
        </div>
      ) : null}

      {savedAuditViews.length ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#6875a0", fontSize: 10 }}>Saved views</span>
          {savedAuditViews.map((view) => {
            const active = areSchedulerAuditFiltersEqual(auditFilters, view.filters);
            return (
              <div
                key={view.id}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <button
                  type="button"
                  onClick={() => onApplySavedAuditView(view)}
                  style={{
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(0,221,255,.38)"
                      : "1px solid #1A2040",
                    background: active ? "rgba(0,221,255,.12)" : "#0a1120",
                    color: active ? "#00DDFF" : "#cbd5e1",
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSavedAuditView(view)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid #1A2040",
                    background: "#080d18",
                    color: "#6875a0",
                    padding: "3px 7px",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                  aria-label={`Remove saved audit view ${view.name}`}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
