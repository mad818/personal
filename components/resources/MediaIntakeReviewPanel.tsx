"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  findMediaEscapeDuplicate,
  MEDIA_ESCAPE_INTAKE_STATUS_LABELS,
  MEDIA_ESCAPE_KIND_LABELS,
  parseMediaEscapeFileName,
  type MediaEscapeIntakeItem,
  type MediaEscapeIntakeStatus,
  type MediaEscapeItem,
  type MediaEscapeKind,
} from "@/lib/subscriptionEscape";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { useActionDialog } from "@/hooks/useActionDialog";

interface MediaIntakeReviewPanelProps {
  items: MediaEscapeItem[];
  intakeItems: MediaEscapeIntakeItem[];
  onChangeIntake: (
    updater: (items: MediaEscapeIntakeItem[]) => MediaEscapeIntakeItem[],
  ) => void;
  onChangeMediaState: (
    updater: (state: {
      mediaLibrary: MediaEscapeItem[];
      mediaIntake: MediaEscapeIntakeItem[];
    }) => {
      mediaLibrary: MediaEscapeItem[];
      mediaIntake: MediaEscapeIntakeItem[];
    },
  ) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

const ACTIVE_INTAKE_STATUSES = new Set<MediaEscapeIntakeStatus>([
  "needs_review",
  "ready",
]);

function cardStyle(tone: "normal" | "accent" | "warning" = "normal") {
  return {
    padding: "12px",
    borderRadius: "12px",
    border:
      tone === "accent"
        ? "1px solid rgba(110, 231, 183, 0.42)"
        : tone === "warning"
          ? "1px solid rgba(250, 204, 21, 0.36)"
          : "1px solid var(--border)",
    background:
      tone === "accent"
        ? "rgba(110, 231, 183, 0.1)"
        : tone === "warning"
          ? "rgba(250, 204, 21, 0.08)"
          : "rgba(10, 15, 30, 0.62)",
  } satisfies CSSProperties;
}

function controlStyle() {
  return {
    width: "100%",
    minWidth: 0,
    padding: "10px 11px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surf2)",
    color: "var(--text)",
    fontSize: "13px",
  } satisfies CSSProperties;
}

function buttonStyle(active = false) {
  return {
    minHeight: "36px",
    padding: "8px 11px",
    borderRadius: "10px",
    border: active
      ? "1px solid rgba(110, 231, 183, 0.56)"
      : "1px solid var(--border)",
    background: active ? "rgba(110, 231, 183, 0.18)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "12px",
    cursor: "pointer",
  } satisfies CSSProperties;
}

function labelStyle() {
  return {
    display: "grid",
    gap: "6px",
  } satisfies CSSProperties;
}

function labelTextStyle() {
  return {
    color: "var(--text3)",
    fontSize: "10px",
    textTransform: "uppercase",
  } satisfies CSSProperties;
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function cleanText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function missingFields(item: MediaEscapeItem) {
  const fields: string[] = [];
  if (!item.coverUrl) fields.push("cover");
  if (!item.year) fields.push("year");
  if (!item.genre) fields.push("genre");
  if (!item.filePath) fields.push("location");
  if (!item.summary) fields.push("notes");
  return fields;
}

function itemFromIntake(item: MediaEscapeIntakeItem): MediaEscapeItem {
  return {
    id: buildId("media"),
    kind: item.kind,
    title: item.suggestedTitle.trim(),
    subtitle: undefined,
    creator: cleanText(item.suggestedCreator),
    year: cleanText(item.suggestedYear),
    genre: cleanText(item.suggestedGenre),
    duration: undefined,
    rating: undefined,
    summary: cleanText(item.notes),
    coverUrl: undefined,
    filePath: cleanText(item.suggestedPath),
    status: "needs_metadata",
    favorite: false,
    updatedAt: new Date().toISOString(),
  };
}

export default function MediaIntakeReviewPanel({
  items,
  intakeItems,
  onChangeIntake,
  onChangeMediaState,
  saveStatus,
}: MediaIntakeReviewPanelProps) {
  const [pasteText, setPasteText] = useState("");
  const [fallbackKind, setFallbackKind] = useState<MediaEscapeKind>("movie");
  const [message, setMessage] = useState("");
  const actionDialog = useActionDialog();

  const activeQueue = useMemo(
    () =>
      intakeItems.filter((item) => ACTIVE_INTAKE_STATUSES.has(item.status)),
    [intakeItems],
  );
  const importedCount = intakeItems.filter(
    (item) => item.status === "imported",
  ).length;
  const ignoredCount = intakeItems.filter(
    (item) => item.status === "ignored",
  ).length;
  const duplicateCount = activeQueue.filter(
    (item) =>
      item.duplicateOfId ||
      findMediaEscapeDuplicate(items, {
        kind: item.kind,
        title: item.suggestedTitle,
        year: item.suggestedYear,
        creator: item.suggestedCreator,
      }),
  ).length;
  const missingInfoItems = items
    .map((item) => ({ item, fields: missingFields(item) }))
    .filter((entry) => entry.fields.length > 0);

  function addToReview() {
    const lines = pasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      setMessage("Paste one filename or path per line.");
      return;
    }
    const now = new Date().toISOString();
    const nextItems = lines.map((line, index): MediaEscapeIntakeItem => {
      const parsed = parseMediaEscapeFileName(line, fallbackKind);
      const duplicate = findMediaEscapeDuplicate(items, {
        kind: parsed.kind,
        title: parsed.suggestedTitle,
        year: parsed.suggestedYear,
        creator: parsed.suggestedCreator,
      });
      return {
        id: `${buildId("intake")}-${index}`,
        rawName: parsed.rawName,
        kind: parsed.kind,
        suggestedTitle: parsed.suggestedTitle,
        suggestedYear: parsed.suggestedYear,
        suggestedCreator: parsed.suggestedCreator,
        suggestedPath: parsed.suggestedPath,
        status: duplicate ? "needs_review" : "ready",
        duplicateOfId: duplicate?.id,
        updatedAt: now,
      };
    });
    onChangeIntake((currentItems) => [...nextItems, ...currentItems]);
    setPasteText("");
    setMessage(
      `Added ${nextItems.length} item${nextItems.length === 1 ? "" : "s"} to review.`,
    );
  }

  function patchIntake(
    item: MediaEscapeIntakeItem,
    patch: Partial<MediaEscapeIntakeItem>,
  ) {
    onChangeIntake((currentItems) =>
      currentItems.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }

  async function importItem(item: MediaEscapeIntakeItem) {
    if (!item.suggestedTitle.trim()) {
      setMessage("Add a title before importing.");
      return;
    }
    const duplicate = findMediaEscapeDuplicate(items, {
      kind: item.kind,
      title: item.suggestedTitle,
      year: item.suggestedYear,
      creator: item.suggestedCreator,
    });
    if (duplicate) {
      const confirmed = await actionDialog.requestActionDialog({
        eyebrow: "Duplicate review",
        title: "Import possible duplicate?",
        description: `"${duplicate.title}" looks like the same ${MEDIA_ESCAPE_KIND_LABELS[item.kind].toLowerCase()}. Importing will keep both entries.`,
        confirmLabel: "Import anyway",
      });
      if (!confirmed) return;
    }
    const mediaItem = itemFromIntake(item);
    const now = new Date().toISOString();
    onChangeMediaState(({ mediaLibrary, mediaIntake }) => ({
      mediaLibrary: [mediaItem, ...mediaLibrary],
      mediaIntake: mediaIntake.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: "imported",
              duplicateOfId: duplicate?.id,
              updatedAt: now,
            }
          : entry,
      ),
    }));
    setMessage(`Imported "${mediaItem.title}" into the library.`);
  }

  function ignoreItem(item: MediaEscapeIntakeItem) {
    patchIntake(item, { status: "ignored" });
    setMessage(`Ignored "${item.suggestedTitle}".`);
  }

  return (
    <section style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={cardStyle("accent")}>
          <SectionLabel detail="Review queue">Waiting</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{activeQueue.length}</strong>
        </div>
        <div style={cardStyle(duplicateCount ? "warning" : "normal")}>
          <SectionLabel detail="Before import">Duplicates</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{duplicateCount}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Needs cleanup">Missing info</SectionLabel>
          <strong style={{ fontSize: "24px" }}>
            {missingInfoItems.length}
          </strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Done/hidden">Reviewed</SectionLabel>
          <strong style={{ fontSize: "24px" }}>
            {importedCount + ignoredCount}
          </strong>
        </div>
      </div>

      <div style={cardStyle()}>
        <SectionLabel detail="Paste one per line">Quick add</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "10px",
            alignItems: "end",
            marginTop: "10px",
          }}
        >
          <label style={labelStyle()}>
            <span style={labelTextStyle()}>Filenames or paths</span>
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder={
                "Movie.Name.2024.1080p.mkv\nArtist - Album (2021).flac\nAuthor - Book Title (2020).epub"
              }
              rows={4}
              style={{ ...controlStyle(), resize: "vertical" }}
            />
          </label>
          <div style={{ display: "grid", gap: "8px" }}>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Fallback type</span>
              <select
                value={fallbackKind}
                onChange={(event) =>
                  setFallbackKind(event.target.value as MediaEscapeKind)
                }
                style={controlStyle()}
              >
                <option value="movie">Movie</option>
                <option value="music">Music</option>
                <option value="book">Book</option>
              </select>
            </label>
            <button type="button" onClick={addToReview} style={buttonStyle(true)}>
              Add to review
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "10px",
          }}
        >
          <ShellBadge
            tone={
              saveStatus === "error"
                ? "default"
                : saveStatus === "saved"
                  ? "success"
                  : "muted"
            }
          >
            {saveStatus === "saving"
              ? "Saving"
              : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Save failed"
                  : "Local review"}
          </ShellBadge>
          {message ? <ShellBadge tone="accent">{message}</ShellBadge> : null}
        </div>
      </div>

      {activeQueue.length ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <SectionLabel detail={`${activeQueue.length} active`}>
            Review queue
          </SectionLabel>
          {activeQueue.slice(0, 8).map((item) => {
            const duplicate =
              (item.duplicateOfId &&
                items.find((entry) => entry.id === item.duplicateOfId)) ||
              findMediaEscapeDuplicate(items, {
                kind: item.kind,
                title: item.suggestedTitle,
                year: item.suggestedYear,
                creator: item.suggestedCreator,
              });
            return (
              <div
                key={item.id}
                style={cardStyle(duplicate ? "warning" : "normal")}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: "14px" }}>
                      {item.suggestedTitle}
                    </strong>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--text2)",
                        fontSize: "11px",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.rawName}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <ShellBadge tone="muted">
                      {MEDIA_ESCAPE_KIND_LABELS[item.kind]}
                    </ShellBadge>
                    <ShellBadge tone={duplicate ? "default" : "success"}>
                      {duplicate ? `Looks like ${duplicate.title}` : "No match"}
                    </ShellBadge>
                    <ShellBadge tone="muted">
                      {MEDIA_ESCAPE_INTAKE_STATUS_LABELS[item.status]}
                    </ShellBadge>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  <label style={labelStyle()}>
                    <span style={labelTextStyle()}>Type</span>
                    <select
                      value={item.kind}
                      onChange={(event) =>
                        patchIntake(item, {
                          kind: event.target.value as MediaEscapeKind,
                          duplicateOfId: undefined,
                        })
                      }
                      style={controlStyle()}
                    >
                      <option value="movie">Movie</option>
                      <option value="music">Music</option>
                    </select>
                  </label>
                  <label style={labelStyle()}>
                    <span style={labelTextStyle()}>Title</span>
                    <input
                      value={item.suggestedTitle}
                      onChange={(event) =>
                        patchIntake(item, {
                          suggestedTitle: event.target.value,
                          duplicateOfId: undefined,
                        })
                      }
                      style={controlStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    <span style={labelTextStyle()}>Artist or director</span>
                    <input
                      value={item.suggestedCreator ?? ""}
                      onChange={(event) =>
                        patchIntake(item, {
                          suggestedCreator: event.target.value,
                          duplicateOfId: undefined,
                        })
                      }
                      style={controlStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    <span style={labelTextStyle()}>Year</span>
                    <input
                      value={item.suggestedYear ?? ""}
                      onChange={(event) =>
                        patchIntake(item, {
                          suggestedYear: event.target.value,
                          duplicateOfId: undefined,
                        })
                      }
                      style={controlStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    <span style={labelTextStyle()}>Genre</span>
                    <input
                      value={item.suggestedGenre ?? ""}
                      onChange={(event) =>
                        patchIntake(item, {
                          suggestedGenre: event.target.value,
                        })
                      }
                      style={controlStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    <span style={labelTextStyle()}>Location</span>
                    <input
                      value={item.suggestedPath ?? ""}
                      onChange={(event) =>
                        patchIntake(item, {
                          suggestedPath: event.target.value,
                        })
                      }
                      style={controlStyle()}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => ignoreItem(item)}
                    style={buttonStyle()}
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => void importItem(item)}
                    style={buttonStyle(true)}
                  >
                    Import
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {missingInfoItems.length ? (
        <div style={cardStyle()}>
          <SectionLabel detail={`${missingInfoItems.length} need cleanup`}>
            Missing info
          </SectionLabel>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {missingInfoItems.slice(0, 8).map(({ item, fields }) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                  padding: "8px 0",
                  borderTop: "1px solid rgba(255, 255, 255, 0.07)",
                }}
              >
                <span
                  style={{
                    color: "var(--text)",
                    fontSize: "12px",
                    minWidth: 0,
                  }}
                >
                  {item.title}
                </span>
                <span style={{ color: "var(--text2)", fontSize: "11px" }}>
                  {fields.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <ActionDialog controller={actionDialog} />
    </section>
  );
}
