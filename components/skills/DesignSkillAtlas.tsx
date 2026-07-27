"use client";

import { useMemo, useState } from "react";
import {
  DESIGN_SKILL_AVAILABILITY,
  DESIGN_SKILL_FAMILY_IDS,
  DESIGN_SKILL_SOURCE,
  DESIGN_SKILL_SOURCE_CATEGORIES,
  DESIGN_SKILLS,
  EXCLUDED_GAME_SKILL_IDS,
  resolveDesignSkill,
  type DesignSkillAvailability,
  type DesignSkillFamilyId,
  type DesignSkillSourceCategory,
} from "@/lib/designSkillAtlas";

type FilterValue<T extends string> = T | "all";

const AVAILABILITY_LABELS: Record<DesignSkillAvailability, string> = {
  native: "Native procedure",
  connector_required: "Connector required",
  host_required: "Host required",
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

export default function DesignSkillAtlas() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<FilterValue<DesignSkillSourceCategory>>("all");
  const [family, setFamily] = useState<FilterValue<DesignSkillFamilyId>>("all");
  const [availability, setAvailability] =
    useState<FilterValue<DesignSkillAvailability>>("all");
  const [selectedId, setSelectedId] = useState(DESIGN_SKILLS[0]?.id ?? "");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return DESIGN_SKILLS.filter((skill) => {
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
    resolveDesignSkill(selectedId) ??
    resolveDesignSkill(filtered[0]?.id) ??
    null;

  return (
    <div data-testid="design-skill-atlas">
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
            Builder procedure atlas
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--text2)",
              fontSize: "11px",
              lineHeight: 1.55,
            }}
          >
            {DESIGN_SKILLS.length} project-owned non-game procedures adapted
            from {DESIGN_SKILL_SOURCE.label}. Every selection resolves to
            inputs, workflow, guardrails, acceptance, and honest prerequisites.
          </p>
        </div>
        <div
          aria-label="Skill source accounting"
          style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
        >
          <span className="nexus-shell-badge nexus-shell-badge--success">
            {DESIGN_SKILLS.length} active
          </span>
          <span className="nexus-shell-badge nexus-shell-badge--muted">
            {EXCLUDED_GAME_SKILL_IDS.length} game entries excluded
          </span>
          <a
            href={DESIGN_SKILL_SOURCE.repositoryUrl}
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
            placeholder="pricing, GSAP, audit, capture…"
            style={{
              minWidth: 0,
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
          label="Source"
          value={category}
          values={DESIGN_SKILL_SOURCE_CATEGORIES}
          onChange={setCategory}
        />
        <SelectField
          label="Family"
          value={family}
          values={DESIGN_SKILL_FAMILY_IDS}
          onChange={setFamily}
        />
        <SelectField
          label="Availability"
          value={availability}
          values={DESIGN_SKILL_AVAILABILITY}
          onChange={setAvailability}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          minHeight: "620px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
          background: "var(--surf)",
        }}
      >
        <div
          style={{
            borderRight: "1px solid var(--border)",
            background: "var(--surf2)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
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
            role="listbox"
            aria-label="Builder procedures"
            style={{
              maxHeight: "620px",
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {filtered.length ? (
              filtered.map((skill) => {
                const active = selected?.id === skill.id;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setSelectedId(skill.id)}
                    style={{
                      display: "grid",
                      gap: "4px",
                      width: "100%",
                      padding: "10px 12px",
                      border: 0,
                      borderBottom: "1px solid var(--border)",
                      background: active ? "var(--surf3)" : "transparent",
                      color: "var(--text)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 850 }}>
                      {skill.title}
                    </span>
                    <span
                      style={{
                        color: "var(--text3)",
                        fontSize: "9px",
                        lineHeight: 1.4,
                      }}
                    >
                      {skill.family} · {skill.availability}
                    </span>
                  </button>
                );
              })
            ) : (
              <p
                style={{
                  margin: 0,
                  padding: "18px 12px",
                  color: "var(--text3)",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                No active non-game procedure matches these filters.
              </p>
            )}
          </div>
        </div>

        <div
          aria-live="polite"
          style={{
            minWidth: 0,
            maxHeight: "660px",
            overflowY: "auto",
            padding: "18px",
          }}
        >
          {selected ? (
            <div style={{ display: "grid", gap: "18px" }}>
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
                    {selected.familyLabel}
                  </span>
                  <span className="nexus-shell-badge nexus-shell-badge--muted">
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
                    fontSize: "18px",
                    lineHeight: 1.2,
                  }}
                >
                  {selected.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text2)",
                    fontSize: "12px",
                    lineHeight: 1.6,
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

              <div
                style={{
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    maxWidth: "620px",
                    color: "var(--text3)",
                    fontSize: "10px",
                    lineHeight: 1.5,
                  }}
                >
                  Read-only procedure. Installs, files, browser actions,
                  deployments, messages, posts, billing, and account changes
                  still require their existing protected tool and authority.
                </p>
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "var(--accent)",
                    fontSize: "10px",
                    fontWeight: 800,
                  }}
                >
                  Open primary source
                </a>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--text3)", fontSize: "11px" }}>
              Choose an active procedure.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
