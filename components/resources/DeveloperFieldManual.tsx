"use client";

import {
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
  const grouped = DEVELOPER_RESOURCES.reduce<
    Record<ResourceCategory, typeof DEVELOPER_RESOURCES>
  >(
    (acc, r) => {
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
        agents, RAG, interviews, and IDE workflows. Prefer official vendor docs
        for billing and security policy; never paste production secrets into
        third-party tools without reviewing their data-flow statements.
      </p>

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
