"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { inspectSecureLink } from "@/lib/secureLink";
import {
  buildLegalPrivacyRoutePosture,
  LEGAL_PRIVACY_ROUTE_OPTIONS,
  type LegalPrivacyRouteKind,
} from "@/lib/legalPrivacyRoute";
import {
  SECURE_STREAM_LINK_CATEGORY_LABELS,
  type SecureStreamLink,
  type SecureStreamLinkCategory,
} from "@/lib/subscriptionEscape";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import MasterDnsVpnReadinessPanel from "@/components/resources/MasterDnsVpnReadinessPanel";

interface SecureLinkOpenPanelProps {
  links: SecureStreamLink[];
  onChangeLinks: (
    updater: (links: SecureStreamLink[]) => SecureStreamLink[],
  ) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

type StreamLinkSort = "favorite" | "recent" | "title";

const SORT_LABELS: Record<StreamLinkSort, string> = {
  favorite: "Favorites first",
  recent: "Recently added",
  title: "A to Z",
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
      tone === "accent" ? "rgba(110, 231, 183, 0.1)" : "var(--surf1)",
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
      ? "1px solid var(--accent)"
      : "1px solid var(--border)",
    background: active ? "var(--surf2)" : "var(--surf1)",
    color: "var(--text)",
    fontSize: "12px",
    cursor: active ? "pointer" : "not-allowed",
    opacity: active ? 1 : 0.58,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
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

function badgeTone(risk: ReturnType<typeof inspectSecureLink>["risk"]) {
  if (risk === "safe") return "success";
  if (risk === "private") return "accent";
  if (risk === "blocked") return "default";
  return "muted";
}

function scopeBadgeTone(
  scope: ReturnType<typeof inspectSecureLink>["networkScope"],
) {
  if (scope === "private" || scope === "same-app") return "success";
  if (scope === "public") return "default";
  if (scope === "blocked") return "default";
  return "muted";
}

function scopeLabel(scope: ReturnType<typeof inspectSecureLink>["networkScope"]) {
  if (scope === "same-app") return "Same app";
  if (scope === "private") return "Private";
  if (scope === "public") return "Public IP risk";
  if (scope === "blocked") return "Blocked";
  return "Unknown";
}

function titleCase(value: string) {
  return value
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function suggestLinkTitle(href: string, displayHost?: string) {
  if (href.startsWith("/")) return "Nexus link";
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    const firstPath = url.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)[0];
    if (firstPath && firstPath.length > 2) return titleCase(firstPath);
    return titleCase(host.split(".")[0] || displayHost || "Stream link");
  } catch {
    return titleCase(displayHost ?? "Stream link");
  }
}

function hostFromHref(href: string) {
  if (href.startsWith("/")) return "Nexus";
  try {
    return new URL(href).hostname;
  } catch {
    return href;
  }
}

function filterAndSortLinks(
  links: SecureStreamLink[],
  query: string,
  category: SecureStreamLinkCategory | "all",
  sort: StreamLinkSort,
) {
  const cleanQuery = query.trim().toLowerCase();
  const filtered = links.filter((link) => {
    if (category !== "all" && link.category !== category) return false;
    if (!cleanQuery) return true;
    return [link.title, link.url, link.notes, link.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(cleanQuery));
  });
  return [...filtered].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "favorite") {
      return (
        Number(b.favorite) - Number(a.favorite) ||
        b.updatedAt.localeCompare(a.updatedAt)
      );
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export default function SecureLinkOpenPanel({
  links,
  onChangeLinks,
  saveStatus,
}: SecureLinkOpenPanelProps) {
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<SecureStreamLinkCategory>("media-server");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<SecureStreamLinkCategory | "all">("all");
  const [sort, setSort] = useState<StreamLinkSort>("favorite");
  const [legalPrivacyRouteKind, setLegalPrivacyRouteKind] =
    useState<LegalPrivacyRouteKind>("none");
  const [privacyRouteConfirmed, setPrivacyRouteConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const inspection = useMemo(() => inspectSecureLink(link), [link]);
  const privacyRoutePosture = useMemo(
    () =>
      buildLegalPrivacyRoutePosture(
        legalPrivacyRouteKind,
        privacyRouteConfirmed,
      ),
    [legalPrivacyRouteKind, privacyRouteConfirmed],
  );
  const visibleLinks = useMemo(
    () => filterAndSortLinks(links, query, categoryFilter, sort),
    [categoryFilter, links, query, sort],
  );
  const favoriteCount = links.filter((item) => item.favorite).length;
  const publicLinkCount = links.filter(
    (item) => inspectSecureLink(item.url).requiresIpPrivacy,
  ).length;
  const lockedPublicLinkCount = links.filter((item) => {
    const itemInspection = inspectSecureLink(item.url);
    return (
      itemInspection.requiresIpPrivacy &&
      !privacyRoutePosture.canOpenPublicLinks
    );
  }).length;

  async function copyLink(href: string) {
    try {
      await navigator.clipboard.writeText(href);
      setMessage("Copied safe link.");
    } catch {
      setMessage("Copy failed.");
    }
  }

  function addTile() {
    if (!inspection.href || !inspection.canOpen) {
      setMessage(inspection.reason);
      return;
    }
    const duplicate = links.find((item) => item.url === inspection.href);
    if (duplicate) {
      setMessage(`"${duplicate.title}" is already on the shelf.`);
      return;
    }
    const next: SecureStreamLink = {
      id: buildId("stream"),
      title:
        title.trim() ||
        suggestLinkTitle(inspection.href, inspection.displayHost),
      url: inspection.href,
      category,
      favorite: links.length === 0,
      updatedAt: new Date().toISOString(),
    };
    onChangeLinks((currentLinks) => [next, ...currentLinks]);
    setLink("");
    setTitle("");
    setMessage(`Added "${next.title}".`);
  }

  function patchLink(
    item: SecureStreamLink,
    patch: Partial<SecureStreamLink>,
  ) {
    onChangeLinks((currentLinks) =>
      currentLinks.map((entry) =>
        entry.id === item.id
          ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  }

  function removeLink(item: SecureStreamLink) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove "${item.title}" from the connect shelf?`)
    ) {
      return;
    }
    onChangeLinks((currentLinks) =>
      currentLinks.filter((entry) => entry.id !== item.id),
    );
    setMessage(`Removed "${item.title}".`);
  }

  return (
    <section style={{ display: "grid", gap: "12px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="S"
        title="Stream connect shelf"
        description="Paste a local, Tailscale, or HTTPS media or reading link. Nexus validates it, saves it as a private tile, and connects without opener access or referrer."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={cardStyle("accent")}>
          <SectionLabel detail="Private launchers">Tiles</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{links.length}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Pinned first">Favorites</SectionLabel>
          <strong style={{ fontSize: "24px" }}>{favoriteCount}</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Validated input">Posture</SectionLabel>
          <strong style={{ fontSize: "16px" }}>{inspection.label}</strong>
        </div>
        <div style={cardStyle(publicLinkCount ? "accent" : "normal")}>
          <SectionLabel detail="VPN/exit-node check">IP guard</SectionLabel>
          <strong style={{ fontSize: "16px" }}>
            {publicLinkCount
              ? privacyRoutePosture.statusLabel
              : "Private only"}
          </strong>
          {lockedPublicLinkCount ? (
            <p
              style={{
                margin: "6px 0 0",
                color: "var(--text2)",
                fontSize: "11px",
              }}
            >
              {lockedPublicLinkCount} public locked
            </p>
          ) : null}
        </div>
      </div>

      <div style={cardStyle()} data-testid="escape-privacy-route-panel">
        <SectionLabel detail="Session only">IP privacy route</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            alignItems: "end",
            marginTop: "10px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={labelTextStyle()}>Legal route</span>
            <select
              data-testid="escape-privacy-route-selector"
              value={legalPrivacyRouteKind}
              onChange={(event) => {
                const next = event.target.value as LegalPrivacyRouteKind;
                setLegalPrivacyRouteKind(next);
                setPrivacyRouteConfirmed(false);
                setMessage(
                  next === "none"
                    ? "Public links locked."
                    : "Confirm the selected route before opening public links.",
                );
              }}
              style={controlStyle()}
            >
              {LEGAL_PRIVACY_ROUTE_OPTIONS.map((option) => (
                <option key={option.kind} value={option.kind}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div style={cardStyle(privacyRoutePosture.active ? "accent" : "normal")}>
            <SectionLabel detail="VPN / Tailscale exit node / Legal proxy">
              Route status
            </SectionLabel>
            <strong
              data-testid="escape-privacy-route-status"
              style={{ fontSize: "16px" }}
            >
              {privacyRoutePosture.statusLabel}
            </strong>
          </div>
        </div>
        <label
          data-testid="escape-privacy-route-confirmation"
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
            marginTop: "10px",
            color: "var(--text2)",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            disabled={!privacyRoutePosture.active}
            checked={privacyRoutePosture.active && privacyRouteConfirmed}
            onChange={(event) => {
              setPrivacyRouteConfirmed(event.target.checked);
              setMessage(
                event.target.checked
                  ? `${privacyRoutePosture.label} confirmed for this session.`
                  : "Public links locked.",
              );
            }}
          />
          <span>{privacyRoutePosture.confirmationLabel}</span>
        </label>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--text2)",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {privacyRoutePosture.summary} Supported legal routes: VPN, Tailscale
          exit node, Legal proxy. Nexus does not hide your IP by itself; it
          keeps public links locked until your own authorized route is selected
          and confirmed.
        </p>
        <MasterDnsVpnReadinessPanel />
      </div>

      <div style={cardStyle()}>
        <SectionLabel detail="Paste link, press add">Add stream link</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "10px",
            alignItems: "end",
            marginTop: "10px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={labelTextStyle()}>Link</span>
            <input
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                setMessage("");
              }}
              placeholder="jellyfin.local:8096, calibre.local, or https://..."
              style={controlStyle()}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={labelTextStyle()}>Name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                inspection.href
                  ? suggestLinkTitle(inspection.href, inspection.displayHost)
                  : "Auto"
              }
              style={controlStyle()}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={labelTextStyle()}>Type</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as SecureStreamLinkCategory)
              }
              style={controlStyle()}
            >
              {Object.entries(SECURE_STREAM_LINK_CATEGORY_LABELS).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={addTile}
            disabled={!inspection.href}
            style={buttonStyle(Boolean(inspection.href))}
          >
            Add tile
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "10px",
          }}
        >
          <ShellBadge tone={badgeTone(inspection.risk)}>
            {inspection.label}
          </ShellBadge>
          {inspection.displayHost ? (
            <ShellBadge tone="muted">{inspection.displayHost}</ShellBadge>
          ) : null}
          <ShellBadge tone={scopeBadgeTone(inspection.networkScope)}>
            {scopeLabel(inspection.networkScope)}
          </ShellBadge>
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
                  : "Local shelf"}
          </ShellBadge>
          {message ? <ShellBadge tone="accent">{message}</ShellBadge> : null}
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: "var(--text2)",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {inspection.reason}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
          alignItems: "end",
        }}
      >
        <label style={{ display: "grid", gap: "6px" }}>
          <span style={labelTextStyle()}>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a tile..."
            style={controlStyle()}
          />
        </label>
        <label style={{ display: "grid", gap: "6px" }}>
          <span style={labelTextStyle()}>Show</span>
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value as SecureStreamLinkCategory | "all",
              )
            }
            style={controlStyle()}
          >
            <option value="all">All links</option>
            {Object.entries(SECURE_STREAM_LINK_CATEGORY_LABELS).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        <label style={{ display: "grid", gap: "6px" }}>
          <span style={labelTextStyle()}>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as StreamLinkSort)}
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

      {visibleLinks.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {visibleLinks.map((item) => (
            <div
              key={item.id}
              style={cardStyle(item.favorite ? "accent" : "normal")}
            >
              {(() => {
                const tileInspection = inspectSecureLink(item.url);
                const connectAllowed =
                  tileInspection.canOpen &&
                  (!tileInspection.requiresIpPrivacy ||
                    privacyRoutePosture.canOpenPublicLinks);
                return (
                  <>
              <div
                style={{
                  aspectRatio: "16 / 10",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background:
                    "linear-gradient(145deg, rgba(56, 122, 255, 0.28), rgba(10, 15, 30, 0.94))",
                  display: "grid",
                  alignContent: "space-between",
                  padding: "10px",
                }}
              >
                <ShellBadge tone={item.favorite ? "success" : "muted"}>
                  {SECURE_STREAM_LINK_CATEGORY_LABELS[item.category]}
                </ShellBadge>
                <ShellBadge tone={scopeBadgeTone(tileInspection.networkScope)}>
                  {scopeLabel(tileInspection.networkScope)}
                </ShellBadge>
                <strong style={{ fontSize: "18px" }}>{item.title}</strong>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "var(--text2)",
                  fontSize: "11px",
                  overflowWrap: "anywhere",
                }}
              >
                {hostFromHref(item.url)}
              </p>
              {tileInspection.requiresIpPrivacy && !privacyRouteConfirmed ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--text2)",
                    fontSize: "11px",
                    lineHeight: 1.45,
                  }}
                >
                  Locked until {privacyRoutePosture.label} is active and
                  confirmed.
                </p>
              ) : null}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                {connectAllowed ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={() =>
                      setMessage(`Connecting to "${item.title}".`)
                    }
                    style={buttonStyle(true)}
                  >
                    Connect
                  </a>
                ) : (
                  <span aria-disabled="true" style={buttonStyle(false)}>
                    Locked
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void copyLink(item.url)}
                  style={buttonStyle(true)}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchLink(item, { favorite: !item.favorite })
                  }
                  style={buttonStyle(true)}
                >
                  {item.favorite ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(item)}
                  style={buttonStyle(true)}
                >
                  Remove
                </button>
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      ) : (
        <div style={cardStyle()}>
          <strong>Add a private stream link.</strong>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--text2)",
              fontSize: "12px",
            }}
          >
            Paste your Jellyfin, Tailscale, LAN, or HTTPS link above. It becomes
            a launch tile after validation.
          </p>
        </div>
      )}
    </section>
  );
}
