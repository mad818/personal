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
    <div>
      <p
        style={{
          fontSize: "12px",
          lineHeight: 1.55,
          color: "var(--text2)",
          maxWidth: "720px",
          margin: "0 0 20px",
        }}
      >
        External references only — not part of Nexus. Use them to go deeper on
        agents, RAG, interviews, and IDE workflows. Prefer official vendor docs
        for billing and security policy; never paste production secrets into
        third-party tools without reviewing their data-flow statements.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        {categories.map((cat) => (
          <section key={cat} aria-labelledby={`field-manual-${cat}`}>
            <h2
              id={`field-manual-${cat}`}
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text3)",
                margin: "0 0 10px",
                paddingBottom: "6px",
                borderBottom: "1px solid var(--border2)",
              }}
            >
              {DEVELOPER_RESOURCE_CATEGORIES[cat]}
            </h2>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {grouped[cat].map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      height: "100%",
                      padding: "14px 14px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--surface2)",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      boxShadow: "0 0 0 0 transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(196,72,90,0.35)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 20px rgba(0,0,0,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "var(--text)",
                        marginBottom: "6px",
                        lineHeight: 1.3,
                      }}
                    >
                      {r.title}
                      <span
                        style={{
                          fontSize: "11px",
                          opacity: 0.65,
                          fontWeight: 600,
                        }}
                      >
                        {" "}
                        ↗
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        lineHeight: 1.5,
                        color: "var(--text2)",
                        margin: 0,
                      }}
                    >
                      {r.description}
                    </p>
                    {r.note && (
                      <p
                        style={{
                          fontSize: "10px",
                          lineHeight: 1.45,
                          color: "var(--text3)",
                          margin: "8px 0 0",
                          fontStyle: "italic",
                        }}
                      >
                        {r.note}
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
