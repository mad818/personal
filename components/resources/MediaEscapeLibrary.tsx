"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { apiFetch } from "@/lib/apiFetch";
import MediaIntakeReviewPanel from "@/components/resources/MediaIntakeReviewPanel";
import {
  createDefaultMediaEscapeItem,
  findMediaEscapeDuplicate,
  filterMediaEscapeItems,
  getMediaEscapeCounts,
  MEDIA_ESCAPE_KIND_LABELS,
  MEDIA_ESCAPE_STATUS_LABELS,
  sortMediaEscapeItems,
  type MediaEscapeItem,
  type MediaEscapeIntakeItem,
  type MediaEscapeKind,
  type MediaEscapeSort,
  type MediaEscapeStatus,
} from "@/lib/subscriptionEscape";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { useActionDialog } from "@/hooks/useActionDialog";

interface MediaEscapeLibraryProps {
  items: MediaEscapeItem[];
  intakeItems: MediaEscapeIntakeItem[];
  onChangeItems: (
    updater: (items: MediaEscapeItem[]) => MediaEscapeItem[],
  ) => void;
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

type MediaDraft = {
  kind: MediaEscapeKind;
  title: string;
  subtitle: string;
  creator: string;
  year: string;
  genre: string;
  duration: string;
  rating: string;
  summary: string;
  coverUrl: string;
  filePath: string;
  status: MediaEscapeStatus;
  favorite: boolean;
};

const SORT_LABELS: Record<MediaEscapeSort, string> = {
  recent: "Recently added",
  title: "A to Z",
  year: "Newest year",
  favorite: "Favorites first",
};

function cardStyle(tone: "normal" | "accent" = "normal"): CSSProperties {
  return {
    padding: "12px",
    borderRadius: "12px",
    border:
      tone === "accent"
        ? "1px solid rgba(110, 231, 183, 0.42)"
        : "1px solid var(--border)",
    background:
      tone === "accent" ? "rgba(110, 231, 183, 0.1)" : "rgba(10, 15, 30, 0.62)",
  };
}

function controlStyle(): CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    padding: "10px 11px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surf2)",
    color: "var(--text)",
    fontSize: "13px",
  };
}

function buttonStyle(active = false): CSSProperties {
  return {
    minHeight: "38px",
    padding: "9px 12px",
    borderRadius: "10px",
    border: active
      ? "1px solid rgba(110, 231, 183, 0.56)"
      : "1px solid var(--border)",
    background: active ? "rgba(110, 231, 183, 0.18)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "12px",
    cursor: "pointer",
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "grid",
    gap: "6px",
  };
}

function labelTextStyle(): CSSProperties {
  return {
    color: "var(--text3)",
    fontSize: "10px",
    textTransform: "uppercase",
  };
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function createDraft(kind: MediaEscapeKind): MediaDraft {
  const base = createDefaultMediaEscapeItem(kind);
  return {
    kind,
    title: base.title ?? "",
    subtitle: base.subtitle ?? "",
    creator: base.creator ?? "",
    year: base.year ?? "",
    genre: base.genre ?? "",
    duration: base.duration ?? "",
    rating: base.rating ?? "",
    summary: base.summary ?? "",
    coverUrl: base.coverUrl ?? "",
    filePath: base.filePath ?? "",
    status: base.status,
    favorite: base.favorite,
  };
}

function draftFromItem(item: MediaEscapeItem): MediaDraft {
  return {
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle ?? "",
    creator: item.creator ?? "",
    year: item.year ?? "",
    genre: item.genre ?? "",
    duration: item.duration ?? "",
    rating: item.rating ?? "",
    summary: item.summary ?? "",
    coverUrl: item.coverUrl ?? "",
    filePath: item.filePath ?? "",
    status: item.status,
    favorite: item.favorite,
  };
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function itemFromDraft(draft: MediaDraft, id: string): MediaEscapeItem {
  return {
    id,
    kind: draft.kind,
    title: draft.title.trim(),
    subtitle: cleanText(draft.subtitle),
    creator: cleanText(draft.creator),
    year: cleanText(draft.year),
    genre: cleanText(draft.genre),
    duration: cleanText(draft.duration),
    rating: cleanText(draft.rating),
    summary: cleanText(draft.summary),
    coverUrl: cleanText(draft.coverUrl),
    filePath: cleanText(draft.filePath),
    status: draft.status,
    favorite: draft.favorite,
    updatedAt: new Date().toISOString(),
  };
}

function getCoverSource(item: MediaEscapeItem) {
  const value = item.coverUrl?.trim();
  if (!value) return null;
  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("/") ||
    value.startsWith("data:image/")
  ) {
    return value;
  }
  return null;
}

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function renderCover(item: MediaEscapeItem, compact = false) {
  const src = getCoverSource(item);
  const initials = getInitials(item.title) || "M";
  return (
    <div
      aria-hidden="true"
      style={{
        aspectRatio: compact ? "1 / 1" : "2 / 3",
        width: "100%",
        minHeight: compact ? "82px" : "190px",
        overflow: "hidden",
        borderRadius: "10px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background:
          item.kind === "movie"
            ? "linear-gradient(145deg, rgba(39, 65, 130, 0.88), rgba(10, 15, 30, 0.95))"
            : item.kind === "book"
              ? "linear-gradient(145deg, rgba(135, 92, 52, 0.88), rgba(10, 15, 30, 0.95))"
              : "linear-gradient(145deg, rgba(30, 106, 92, 0.88), rgba(10, 15, 30, 0.95))",
        display: "grid",
        placeItems: "center",
        color: "var(--text)",
        fontSize: compact ? "22px" : "34px",
        fontWeight: 700,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export default function MediaEscapeLibrary({
  items,
  intakeItems,
  onChangeItems,
  onChangeIntake,
  onChangeMediaState,
  saveStatus,
}: MediaEscapeLibraryProps) {
  const [draft, setDraft] = useState<MediaDraft>(() => createDraft("movie"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<MediaEscapeKind | "all">("all");
  const [sort, setSort] = useState<MediaEscapeSort>("recent");
  const [message, setMessage] = useState("");
  const [coverUploadStatus, setCoverUploadStatus] = useState<
    "idle" | "uploading" | "uploaded" | "error"
  >("idle");
  const actionDialog = useActionDialog();

  const counts = useMemo(() => getMediaEscapeCounts(items), [items]);
  const visibleItems = useMemo(
    () =>
      sortMediaEscapeItems(
        filterMediaEscapeItems(items, { query, kind: kindFilter }),
        sort,
      ),
    [items, kindFilter, query, sort],
  );
  const selectedItem =
    items.find((item) => item.id === selectedId) ??
    visibleItems[0] ??
    items[0] ??
    null;
  const favorites = useMemo(
    () =>
      sortMediaEscapeItems(
        items.filter((item) => item.favorite),
        "recent",
      ),
    [items],
  );
  const movies = useMemo(
    () =>
      sortMediaEscapeItems(
        items.filter((item) => item.kind === "movie"),
        sort,
      ),
    [items, sort],
  );
  const music = useMemo(
    () =>
      sortMediaEscapeItems(
        items.filter((item) => item.kind === "music"),
        sort,
      ),
    [items, sort],
  );
  const books = useMemo(
    () =>
      sortMediaEscapeItems(
        items.filter((item) => item.kind === "book"),
        sort,
      ),
    [items, sort],
  );

  function updateDraft(patch: Partial<MediaDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function startNew(kind: MediaEscapeKind) {
    setDraft(createDraft(kind));
    setEditingId(null);
    setMessage("");
  }

  function startEditing(item: MediaEscapeItem) {
    setDraft(draftFromItem(item));
    setEditingId(item.id);
    setSelectedId(item.id);
    setMessage("");
  }

  async function saveDraft() {
    if (!draft.title.trim()) {
      setMessage("Add a title first.");
      return;
    }

    const id = editingId ?? buildId("media");
    const nextItem = itemFromDraft(draft, id);
    const duplicate = editingId
      ? null
      : findMediaEscapeDuplicate(items, nextItem);
    if (duplicate) {
      const confirmed = await actionDialog.requestActionDialog({
        eyebrow: "Duplicate review",
        title: "Add possible duplicate?",
        description: `"${duplicate.title}" looks like the same ${MEDIA_ESCAPE_KIND_LABELS[nextItem.kind].toLowerCase()}. Adding it will keep both entries.`,
        confirmLabel: "Add anyway",
      });
      if (!confirmed) return;
    }
    onChangeItems((currentItems) => {
      if (editingId) {
        return currentItems.map((item) =>
          item.id === editingId ? nextItem : item,
        );
      }
      return [nextItem, ...currentItems];
    });
    setSelectedId(id);
    setEditingId(null);
    setDraft(createDraft(draft.kind));
    setMessage(editingId ? "Saved changes." : "Added to library.");
  }

  async function removeItem(item: MediaEscapeItem) {
    const confirmed = await actionDialog.requestActionDialog({
      eyebrow: "Local library",
      title: `Remove "${item.title}"?`,
      description:
        "This removes the catalog entry and its Nexus metadata. It does not delete the original media file.",
      confirmLabel: "Remove item",
      tone: "danger",
    });
    if (!confirmed) return;

    onChangeItems((currentItems) =>
      currentItems.filter((entry) => entry.id !== item.id),
    );
    if (selectedId === item.id) setSelectedId(null);
    if (editingId === item.id) {
      setEditingId(null);
      setDraft(createDraft(item.kind));
    }
    setMessage("Removed from library.");
  }

  function toggleFavorite(item: MediaEscapeItem) {
    onChangeItems((currentItems) =>
      currentItems.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              favorite: !entry.favorite,
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setCoverUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await apiFetch("/api/subscription-escape/assets", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { url?: string };
      if (!payload.url) throw new Error("Missing private asset URL.");
      updateDraft({ coverUrl: payload.url });
      setCoverUploadStatus("uploaded");
      setMessage("Private cover uploaded.");
    } catch {
      setCoverUploadStatus("error");
      setMessage("Cover upload failed.");
    }
  }

  function renderMediaCard(item: MediaEscapeItem) {
    const active = selectedItem?.id === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSelectedId(item.id)}
        style={{
          ...cardStyle(active ? "accent" : "normal"),
          cursor: "pointer",
          textAlign: "left",
          minWidth: 0,
        }}
      >
        {renderCover(item, true)}
        <strong
          style={{
            display: "block",
            marginTop: "10px",
            fontSize: "13px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </strong>
        <span
          style={{
            display: "block",
            marginTop: "4px",
            color: "var(--text2)",
            fontSize: "11px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.creator || item.subtitle || MEDIA_ESCAPE_KIND_LABELS[item.kind]}
        </span>
      </button>
    );
  }

  function renderShelf(
    title: string,
    shelfItems: MediaEscapeItem[],
    detail: string,
  ) {
    if (!shelfItems.length) return null;
    return (
      <section style={{ display: "grid", gap: "10px" }}>
        <SectionLabel detail={detail}>{title}</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))",
            gap: "10px",
          }}
        >
          {shelfItems.slice(0, 12).map((item) => renderMediaCard(item))}
        </div>
      </section>
    );
  }

  const activeSearch = Boolean(query.trim()) || kindFilter !== "all";

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="success"
        compact
        icon="M"
        title="Movie, music, and book library"
        description="One local catalog for owned movies, albums, songs, ebooks, comics, manuals, and reading lists. Add the cover, location, and notes now; sort the files later when you are ready."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={cardStyle("accent")}>
          <SectionLabel detail="Library">Total</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{counts.total}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Videos">Movies</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{counts.movie}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Albums/songs">Music</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{counts.music}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Ebooks/PDFs">Books</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{counts.book}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Quick picks">Favorites</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{counts.favorite}</strong>
        </div>
      </div>

      <MediaIntakeReviewPanel
        items={items}
        intakeItems={intakeItems}
        onChangeIntake={onChangeIntake}
        onChangeMediaState={onChangeMediaState}
        saveStatus={saveStatus}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "10px",
          alignItems: "end",
        }}
      >
        <button
          type="button"
          onClick={() => startNew("movie")}
          style={buttonStyle(draft.kind === "movie" && !editingId)}
        >
          Add movie
        </button>
        <button
          type="button"
          onClick={() => startNew("music")}
          style={buttonStyle(draft.kind === "music" && !editingId)}
        >
          Add music
        </button>
        <button
          type="button"
          onClick={() => startNew("book")}
          style={buttonStyle(draft.kind === "book" && !editingId)}
        >
          Add book
        </button>
        <label style={labelStyle()}>
          <span style={labelTextStyle()}>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find title, author, artist, genre..."
            style={controlStyle()}
          />
        </label>
        <label style={labelStyle()}>
          <span style={labelTextStyle()}>Show</span>
          <select
            value={kindFilter}
            onChange={(event) =>
              setKindFilter(event.target.value as MediaEscapeKind | "all")
            }
            style={controlStyle()}
          >
            <option value="all">Movies, music, and books</option>
            <option value="movie">Movies only</option>
            <option value="music">Music only</option>
            <option value="book">Books only</option>
          </select>
        </label>
        <label style={labelStyle()}>
          <span style={labelTextStyle()}>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as MediaEscapeSort)}
            style={controlStyle()}
          >
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "12px",
        }}
      >
        <section style={cardStyle("accent")}>
          {selectedItem ? (
            <div style={{ display: "grid", gap: "12px" }}>
              {renderCover(selectedItem)}
              <div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <ShellBadge tone="accent">
                    {MEDIA_ESCAPE_KIND_LABELS[selectedItem.kind]}
                  </ShellBadge>
                  <ShellBadge
                    tone={selectedItem.favorite ? "success" : "muted"}
                  >
                    {selectedItem.favorite ? "Favorite" : "Not favorite"}
                  </ShellBadge>
                  <ShellBadge tone="muted">
                    {MEDIA_ESCAPE_STATUS_LABELS[selectedItem.status]}
                  </ShellBadge>
                </div>
                <h3 style={{ margin: "10px 0 4px", fontSize: "22px" }}>
                  {selectedItem.title}
                </h3>
                <p
                  style={{ margin: 0, color: "var(--text2)", fontSize: "13px" }}
                >
                  {[
                    selectedItem.creator,
                    selectedItem.subtitle,
                    selectedItem.year,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "Details can be added anytime."}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "6px",
                  color: "var(--text2)",
                  fontSize: "12px",
                }}
              >
                {selectedItem.genre ? (
                  <span>Genre: {selectedItem.genre}</span>
                ) : null}
                {selectedItem.duration ? (
                  <span>Length: {selectedItem.duration}</span>
                ) : null}
                {selectedItem.rating ? (
                  <span>Rating: {selectedItem.rating}</span>
                ) : null}
                {selectedItem.filePath ? (
                  <span>Location: {selectedItem.filePath}</span>
                ) : null}
              </div>
              {selectedItem.summary ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--text2)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedItem.summary}
                </p>
              ) : null}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => startEditing(selectedItem)}
                  style={buttonStyle(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedItem)}
                  style={buttonStyle(selectedItem.favorite)}
                >
                  {selectedItem.favorite ? "Unfavorite" : "Favorite"}
                </button>
                <button
                  type="button"
                  onClick={() => void removeItem(selectedItem)}
                  style={buttonStyle()}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "10px",
                minHeight: "260px",
                placeItems: "center",
                textAlign: "center",
              }}
            >
              <strong style={{ fontSize: "20px" }}>Start your library.</strong>
              <p
                style={{
                  margin: 0,
                  color: "var(--text2)",
                  fontSize: "13px",
                  maxWidth: "320px",
                }}
              >
                Add one movie, album, or book. A cover can come later.
              </p>
            </div>
          )}
        </section>

        <section style={cardStyle()}>
          <SectionLabel detail={editingId ? "Update item" : "New item"}>
            {editingId ? "Edit media" : "Add media"}
          </SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Type</span>
              <select
                value={draft.kind}
                onChange={(event) =>
                  updateDraft({ kind: event.target.value as MediaEscapeKind })
                }
                style={controlStyle()}
              >
                <option value="movie">Movie</option>
                <option value="music">Music</option>
                <option value="book">Book</option>
              </select>
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Title</span>
              <input
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="Movie, album, song, or book"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Author, artist, or director</span>
              <input
                value={draft.creator}
                onChange={(event) =>
                  updateDraft({ creator: event.target.value })
                }
                placeholder="Author, artist, band, director"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Series, album, or subtitle</span>
              <input
                value={draft.subtitle}
                onChange={(event) =>
                  updateDraft({ subtitle: event.target.value })
                }
                placeholder="Series, edition, album"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Year</span>
              <input
                value={draft.year}
                onChange={(event) => updateDraft({ year: event.target.value })}
                placeholder="2026"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Genre</span>
              <input
                value={draft.genre}
                onChange={(event) => updateDraft({ genre: event.target.value })}
                placeholder="Sci-fi, action, hip hop, jazz"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Length</span>
              <input
                value={draft.duration}
                onChange={(event) =>
                  updateDraft({ duration: event.target.value })
                }
                placeholder="320 pages, 2h 10m, or 12 tracks"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Rating</span>
              <input
                value={draft.rating}
                onChange={(event) =>
                  updateDraft({ rating: event.target.value })
                }
                placeholder="5 stars, PG-13, clean, explicit"
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  updateDraft({
                    status: event.target.value as MediaEscapeStatus,
                  })
                }
                style={controlStyle()}
              >
                {Object.entries(MEDIA_ESCAPE_STATUS_LABELS).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Cover or poster</span>
              <input
                value={draft.coverUrl}
                onChange={(event) =>
                  updateDraft({ coverUrl: event.target.value })
                }
                placeholder="/api/subscription-escape/assets/..."
                style={controlStyle()}
              />
            </label>
            <label style={labelStyle()}>
              <span style={labelTextStyle()}>Private image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(event) =>
                  void uploadCover(event.currentTarget.files?.[0] ?? null)
                }
                style={controlStyle()}
              />
            </label>
            <label style={{ ...labelStyle(), gridColumn: "1 / -1" }}>
              <span style={labelTextStyle()}>File or location</span>
              <input
                value={draft.filePath}
                onChange={(event) =>
                  updateDraft({ filePath: event.target.value })
                }
                placeholder="MacBook media/books folder, drive, shelf, or note"
                style={controlStyle()}
              />
            </label>
            <label style={{ ...labelStyle(), gridColumn: "1 / -1" }}>
              <span style={labelTextStyle()}>Notes</span>
              <textarea
                value={draft.summary}
                onChange={(event) =>
                  updateDraft({ summary: event.target.value })
                }
                placeholder="What is it about? Anything to remember?"
                rows={4}
                style={{ ...controlStyle(), resize: "vertical" }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--text2)",
                fontSize: "12px",
              }}
            >
              <input
                type="checkbox"
                checked={draft.favorite}
                onChange={(event) =>
                  updateDraft({ favorite: event.target.checked })
                }
              />
              Favorite
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => startNew(draft.kind)}
                  style={buttonStyle()}
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void saveDraft()}
                style={buttonStyle(true)}
              >
                {editingId ? "Save changes" : "Add to library"}
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: "10px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
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
                    : "Local file"}
            </ShellBadge>
            {message ? <ShellBadge tone="accent">{message}</ShellBadge> : null}
            {coverUploadStatus !== "idle" ? (
              <ShellBadge
                tone={
                  coverUploadStatus === "uploaded"
                    ? "success"
                    : coverUploadStatus === "error"
                      ? "default"
                      : "muted"
                }
              >
                {coverUploadStatus === "uploading"
                  ? "Uploading cover"
                  : coverUploadStatus === "uploaded"
                    ? "Private cover ready"
                    : "Cover upload failed"}
              </ShellBadge>
            ) : null}
          </div>
        </section>
      </div>

      {items.length === 0 ? (
        <div style={cardStyle()}>
          <strong>Add the first movie, album, or book.</strong>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--text2)",
              fontSize: "12px",
            }}
          >
            Use the big buttons above, type the title, and save. Sorting can
            happen later.
          </p>
        </div>
      ) : activeSearch ? (
        visibleItems.length ? (
          renderShelf(
            "Search results",
            visibleItems,
            `${visibleItems.length} match`,
          )
        ) : (
          <div style={cardStyle()}>
            <strong>No match found.</strong>
            <p
              style={{
                margin: "8px 0 0",
                color: "var(--text2)",
                fontSize: "12px",
              }}
            >
              Clear search or switch the filter back to all media.
            </p>
          </div>
        )
      ) : (
        <>
          {renderShelf(
            "Recently added",
            sortMediaEscapeItems(items, "recent"),
            "Fresh shelf",
          )}
          {renderShelf("Favorites", favorites, `${favorites.length} saved`)}
          {renderShelf("Movies", movies, `${movies.length} titles`)}
          {renderShelf("Music", music, `${music.length} entries`)}
          {renderShelf("Books", books, `${books.length} titles`)}
        </>
      )}
      <ActionDialog controller={actionDialog} />
    </div>
  );
}
