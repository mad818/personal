"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  DEVELOPER_RESOURCE_FIT_LABELS,
  DEVELOPER_RESOURCES,
  DEVELOPER_RESOURCE_CATEGORIES,
  type ResourceCategory,
} from "@/lib/developerResources";

function categoryOrder(a: ResourceCategory, b: ResourceCategory): number {
  const order: ResourceCategory[] = [
    "certification",
    "study",
    "tooling",
    "ecosystem",
  ];
  return order.indexOf(a) - order.indexOf(b);
}

export default function DeveloperFieldManual() {
  const [query, setQuery] = useState("");
  const [costFilter, setCostFilter] = useState<
    "all" | "free" | "limited_free" | "open_source" | "byok" | "license_check"
  >("all");
  const deferredQuery = useDeferredValue(query);

  const filteredResources = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return DEVELOPER_RESOURCES.filter((resource) => {
      const matchesTerm =
        !term ||
        [
          resource.title,
          resource.description,
          resource.note ?? "",
          (resource.tags ?? []).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesCost =
        costFilter === "all" || resource.costTier === costFilter;
      return matchesTerm && matchesCost;
    });
  }, [costFilter, deferredQuery]);

  const grouped = DEVELOPER_RESOURCES.reduce<
    Record<ResourceCategory, typeof DEVELOPER_RESOURCES>
  >(
    (acc, r) => {
      if (!filteredResources.includes(r)) return acc;
      acc[r.category] = acc[r.category] ?? [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<ResourceCategory, typeof DEVELOPER_RESOURCES>,
  );

  const categories = (Object.keys(grouped) as ResourceCategory[]).sort(
    categoryOrder,
  );

  return (
    <div className="nexus-shell-resource-manual">
      <p className="nexus-shell-resource-intro">
        External references only — not part of Nexus. Use them to go deeper on
        agents, workflow systems, doctrine, interviews, and IDE workflows.
        Prefer official vendor docs for billing and security policy; never paste
        production secrets into third-party tools without reviewing their
        data-flow statements.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 220px)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, note, or tag"
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--surf2)",
            color: "var(--text)",
          }}
        />
        <select
          value={costFilter}
          onChange={(event) =>
            setCostFilter(
              event.target.value as
                | "all"
                | "free"
                | "limited_free"
                | "open_source"
                | "byok"
                | "license_check",
            )
          }
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--surf2)",
            color: "var(--text)",
          }}
        >
          <option value="all">All cost tiers</option>
          <option value="free">Free</option>
          <option value="limited_free">Limited free</option>
          <option value="open_source">Open source</option>
          <option value="byok">BYOK</option>
          <option value="license_check">License check</option>
        </select>
      </div>

      <div className="nexus-shell-resource-sections">
        {categories.map((cat) => (
          <section
            key={cat}
            aria-labelledby={`field-manual-${cat}`}
            className="nexus-shell-resource-section"
          >
            <div className="nexus-shell-resource-section__header">
              <h2
                id={`field-manual-${cat}`}
                className="nexus-shell-resource-section__title"
              >
                {DEVELOPER_RESOURCE_CATEGORIES[cat]}
              </h2>
              <span className="nexus-shell-resource-section__count">
                {grouped[cat].length} reference
                {grouped[cat].length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="nexus-shell-resource-grid">
              {grouped[cat].map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nexus-shell-resource-card"
                  >
                    <div className="nexus-shell-resource-card__meta">
                      <span className="nexus-shell-resource-card__chip">
                        {DEVELOPER_RESOURCE_CATEGORIES[cat]}
                      </span>
                      {r.costTier ? (
                        <span className="nexus-shell-resource-card__chip">
                          {r.costTier.replace(/_/g, " ")}
                        </span>
                      ) : null}
                      {r.integrationFit ? (
                        <span className="nexus-shell-resource-card__chip">
                          {DEVELOPER_RESOURCE_FIT_LABELS[r.integrationFit]}
                        </span>
                      ) : null}
                      <span className="nexus-shell-resource-card__external">
                        External ↗
                      </span>
                    </div>
                    <div className="nexus-shell-resource-card__title">
                      {r.title}
                    </div>
                    <p className="nexus-shell-resource-card__description">
                      {r.description}
                    </p>
                    {r.note && (
                      <p className="nexus-shell-resource-card__note">{r.note}</p>
                    )}
                    {r.licenseHint && (
                      <p className="nexus-shell-resource-card__note">
                        License posture: {r.licenseHint}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
