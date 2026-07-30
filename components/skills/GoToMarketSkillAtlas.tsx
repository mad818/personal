"use client";

import { useMemo, useState } from "react";
import {
  EXCLUDED_GO_TO_MARKET_SKILLS,
  GO_TO_MARKET_AVAILABILITY,
  GO_TO_MARKET_FAMILY_IDS,
  GO_TO_MARKET_SKILL_SOURCE,
  GO_TO_MARKET_SKILLS,
  GO_TO_MARKET_SOURCE_CATEGORIES,
  resolveGoToMarketSkill,
  type GoToMarketAvailability,
  type GoToMarketFamilyId,
  type GoToMarketSourceCategory,
} from "@/lib/goToMarketSkillAtlas";

type FilterValue<T extends string> = T | "all";

const AVAILABILITY_LABELS: Record<GoToMarketAvailability, string> = {
  native: "Native procedure",
  source_required: "Source required",
  connector_required: "Connector required",
  host_required: "Host tools required",
  dependency_review: "Dependency review",
};

function SelectField<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: FilterValue<T>;
  values: readonly T[];
  onChange: (value: FilterValue<T>) => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: "5px",
        minWidth: 0,
        color: "var(--text3)",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as FilterValue<T>)}
        style={{
          minWidth: 0,
          width: "100%",
          minHeight: "36px",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          background: "var(--surf)",
          color: "var(--text)",
          padding: "0 10px",
          font: "inherit",
          fontSize: "11px",
          textTransform: "none",
          letterSpacing: 0,
        }}
      >
        <option value="all">All</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProcedureList({
  title,
  values,
}: {
  title: string;
  values: readonly string[];
}) {
  return (
    <section>
      <h4
        style={{
          margin: "0 0 8px",
          color: "var(--text3)",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h4>
      <ol
        style={{
          display: "grid",
          gap: "7px",
          margin: 0,
          paddingLeft: "19px",
          color: "var(--text2)",
          fontSize: "11px",
          lineHeight: 1.55,
        }}
      >
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ol>
    </section>
  );
}

export default function GoToMarketSkillAtlas() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<FilterValue<GoToMarketSourceCategory>>("all");
  const [family, setFamily] = useState<FilterValue<GoToMarketFamilyId>>("all");
  const [availability, setAvailability] =
    useState<FilterValue<GoToMarketAvailability>>("all");
  const [selectedId, setSelectedId] = useState(
    GO_TO_MARKET_SKILLS[0]?.id ?? "",
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return GO_TO_MARKET_SKILLS.filter((skill) => {
      if (category !== "all" && skill.sourceCategory !== category) return false;
      if (family !== "all" && skill.family !== family) return false;
      if (availability !== "all" && skill.availability !== availability) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        skill.id,
        skill.title,
        skill.purpose,
        skill.family,
        skill.sourceCategory,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [availability, category, family, query]);

  const selected =
    resolveGoToMarketSkill(selectedId) ??
    resolveGoToMarketSkill(filtered[0]?.id) ??
    null;

  return (
    <div data-testid="go-to-market-skill-atlas">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div style={{ maxWidth: "720px" }}>
          <div
            style={{
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: 900,
              marginBottom: "4px",
            }}
          >
            Go-to-market procedure atlas
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--text2)",
              fontSize: "11px",
              lineHeight: 1.55,
            }}
          >
            {GO_TO_MARKET_SKILLS.length} project-owned visual, content, launch,
            market, outreach, research, and developer-communication procedures
            adapted from {GO_TO_MARKET_SKILL_SOURCE.label}. Procedures describe
            the work; they never authorize an account, connector, or external
            action.
          </p>
        </div>
        <div
          aria-label="Go-to-market source accounting"
          style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
        >
          <span className="nexus-shell-badge nexus-shell-badge--success">
            {GO_TO_MARKET_SKILLS.length} active
          </span>
          <span className="nexus-shell-badge nexus-shell-badge--muted">
            {EXCLUDED_GO_TO_MARKET_SKILLS.length} boundary exclusions
          </span>
          <a
            href={GO_TO_MARKET_SKILL_SOURCE.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="nexus-shell-badge nexus-shell-badge--accent"
          >
            MIT source
          </a>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: "5px",
            minWidth: 0,
            color: "var(--text3)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="launch, pricing, content, PR…"
            style={{
              minWidth: 0,
              width: "100%",
              minHeight: "36px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--surf)",
              color: "var(--text)",
              padding: "0 10px",
              font: "inherit",
              fontSize: "11px",
              textTransform: "none",
              letterSpacing: 0,
            }}
          />
        </label>
        <SelectField
          label="Category"
          value={category}
          values={GO_TO_MARKET_SOURCE_CATEGORIES}
          onChange={setCategory}
        />
        <SelectField
          label="Family"
          value={family}
          values={GO_TO_MARKET_FAMILY_IDS}
          onChange={setFamily}
        />
        <SelectField
          label="Availability"
          value={availability}
          values={GO_TO_MARKET_AVAILABILITY}
          onChange={setAvailability}
        />
      </div>

      <div
        aria-live="polite"
        style={{
          marginBottom: "10px",
          color: "var(--text3)",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {filtered.length} matching procedures
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(min(100%, 230px), 0.72fr) minmax(0, 1.28fr)",
          gap: "10px",
          alignItems: "start",
        }}
      >
        <div
          aria-label="Go-to-market procedures"
          style={{
            display: "grid",
            gap: "6px",
            maxHeight: "560px",
            overflowY: "auto",
            paddingRight: "3px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "18px",
                color: "var(--text3)",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              No matching procedure. Clear one filter or use a broader search.
            </div>
          ) : (
            filtered.map((skill) => {
              const active = selected?.id === skill.id;
              return (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(skill.id)}
                  style={{
                    display: "grid",
                    gap: "4px",
                    width: "100%",
                    border: `1px solid ${
                      active ? "var(--accent)" : "var(--border)"
                    }`,
                    borderRadius: "6px",
                    background: active ? "var(--surf3)" : "var(--surf)",
                    color: "var(--text)",
                    padding: "10px",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 900 }}>
                    {skill.title}
                  </span>
                  <span
                    style={{
                      color: "var(--text3)",
                      fontSize: "9px",
                      lineHeight: 1.35,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {skill.family} · {skill.availability}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <article
          style={{
            minWidth: 0,
            border: "1px solid var(--border)",
            borderRadius: "6px",
            background: "var(--surf)",
            padding: "14px",
          }}
        >
          {selected ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <header>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    marginBottom: "8px",
                  }}
                >
                  <span className="nexus-shell-badge nexus-shell-badge--accent">
                    {selected.sourceCategory}
                  </span>
                  <span className="nexus-shell-badge nexus-shell-badge--muted">
                    {AVAILABILITY_LABELS[selected.availability]}
                  </span>
                </div>
                <h3
                  style={{
                    margin: "0 0 7px",
                    color: "var(--text)",
                    fontSize: "16px",
                  }}
                >
                  {selected.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text2)",
                    fontSize: "11px",
                    lineHeight: 1.55,
                  }}
                >
                  {selected.purpose}
                </p>
              </header>
              <ProcedureList
                title="Requirements"
                values={selected.requirements}
              />
              <ProcedureList title="Inputs" values={selected.inputs} />
              <ProcedureList title="Workflow" values={selected.workflow} />
              <ProcedureList title="Guardrails" values={selected.guardrails} />
              <ProcedureList
                title="Acceptance checks"
                values={selected.acceptanceChecks}
              />
              <p
                style={{
                  margin: 0,
                  borderTop: "1px solid var(--border)",
                  paddingTop: "11px",
                  color: "var(--text3)",
                  fontSize: "10px",
                  lineHeight: 1.5,
                }}
              >
                Read-only contract. Install, browser, provider, media, account,
                message, post, ad, PR, dependency, deployment, purchase, and
                publication actions remain separately protected.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--text3)", fontSize: "11px" }}>
              Select a procedure to inspect its complete contract.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
