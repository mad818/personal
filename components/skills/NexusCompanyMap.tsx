"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ShellButton } from "@/components/ui/shell";
import { queueHQPrompt } from "@/lib/hqPromptQueue";
import {
  buildCompanyMissionBrief,
  COMPANY_AGENT_NAMES,
  getCompanyDepartment,
  getCompanyMapSummary,
  getCompanySource,
  NEXUS_COMPANY_DEPARTMENTS,
  type CompanySourceKind,
} from "@/lib/nexusCompanyMap";

const SOURCE_KIND_LABELS: Record<CompanySourceKind, string> = {
  nexus_native: "Nexus native",
  codex_skill: "Codex skill",
  mcp_tool: "MCP tool",
  reference: "Reference",
  translation_required: "Translate first",
};

function TinyLabel({ children }: { children: React.ReactNode }) {
  return <span className="nexus-company-map__tiny-label">{children}</span>;
}

export default function NexusCompanyMap() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const summary = useMemo(() => getCompanyMapSummary(), []);
  const [selectedId, setSelectedId] = useState(NEXUS_COMPANY_DEPARTMENTS[0].id);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "blocked">("idle");
  const department = getCompanyDepartment(selectedId);
  const sources = department.sourceIds.map(getCompanySource);
  const brief = buildCompanyMissionBrief(selectedId);

  const selectDepartment = (departmentId: string) => {
    setSelectedId(departmentId);
    setCopyState("idle");
  };

  const handleDepartmentKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % NEXUS_COMPANY_DEPARTMENTS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + NEXUS_COMPANY_DEPARTMENTS.length) % NEXUS_COMPANY_DEPARTMENTS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = NEXUS_COMPANY_DEPARTMENTS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextDepartment = NEXUS_COMPANY_DEPARTMENTS[nextIndex];
    selectDepartment(nextDepartment.id);
    document.getElementById(`company-department-${nextDepartment.id}`)?.focus();
  };

  const openInHq = () => {
    queueHQPrompt(brief);
    router.push("/hq?focus=hq-console-shell");
  };

  const copyForChatGpt = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      setCopyState("copied");
    } catch {
      setCopyState("blocked");
    }
  };

  return (
    <section data-testid="nexus-company-map" className="nexus-company-map">
      <header className="nexus-company-map__header">
        <div className="nexus-company-map__intro">
          <span className="nexus-company-map__eyebrow">
            <span className="nexus-company-map__status-dot" aria-hidden="true" />
            Company structure
          </span>
          <h2>Department routing map</h2>
          <p>
            Select a department to stage a bounded HQ mission or inspect the reviewed capability sources behind it.
          </p>
          <span className="nexus-company-map__guardrail">
            MAX coordinates the existing agent bench · no automatic installs
          </span>
        </div>

        <dl className="nexus-company-map__metrics" aria-label="Company map inventory">
          {[
            ["Depts", summary.departmentCount],
            ["Sources", summary.sourceCount],
            ["Native / adapted", summary.nativeOrAdaptedCount],
            ["Translate first", summary.translationRequiredCount],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <nav className="nexus-company-map__department-rail" role="tablist" aria-label="Company departments">
        {NEXUS_COMPANY_DEPARTMENTS.map((item, index) => {
          const active = item.id === selectedId;
          const sourceLabel = `${item.sourceIds.length} source${item.sourceIds.length === 1 ? "" : "s"}`;

          return (
            <button
              id={`company-department-${item.id}`}
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="company-department-panel"
              tabIndex={active ? 0 : -1}
              className={`nexus-company-map__department${active ? " is-active" : ""}`}
              onClick={() => selectDepartment(item.id)}
              onKeyDown={(event) => handleDepartmentKeyDown(event, index)}
            >
              {active ? (
                <motion.span
                  className="nexus-company-map__department-marker"
                  layoutId="nexus-company-map-active-department"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                  aria-hidden="true"
                />
              ) : null}
              <span className="nexus-company-map__department-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="nexus-company-map__department-copy">
                <strong>{item.label}</strong>
                <span>{COMPANY_AGENT_NAMES[item.leadAgentId]} · {sourceLabel}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="nexus-company-map__workspace">
        <motion.article
          id="company-department-panel"
          key={department.id}
          role="tabpanel"
          aria-labelledby={`company-department-${department.id}`}
          className="nexus-company-map__mission"
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="nexus-company-map__lead-line">
            <span className="nexus-company-map__lead-identity">
              <span className="nexus-company-map__lead-pulse" aria-hidden="true" />
              <span>
                <TinyLabel>Assigned lead</TinyLabel>
                <strong>{COMPANY_AGENT_NAMES[department.leadAgentId]}</strong>
              </span>
            </span>
            <span>{sources.length} reviewed source{sources.length === 1 ? "" : "s"}</span>
          </div>

          <div className="nexus-company-map__mission-copy">
            <TinyLabel>Selected department</TinyLabel>
            <h3>{department.label}</h3>
            <p>{department.mission}</p>
          </div>

          <div className="nexus-company-map__deliverables">
            <TinyLabel>Required deliverables</TinyLabel>
            <ul>
              {department.deliverables.map((deliverable) => (
                <li key={deliverable}>{deliverable}</li>
              ))}
            </ul>
          </div>

          <div className="nexus-company-map__boundary">
            <TinyLabel>Operating boundary</TinyLabel>
            <p>{department.boundary}</p>
          </div>

          <div className="nexus-company-map__handoff">
            <div className="nexus-ops-action-cluster">
              <ShellButton active onClick={openInHq} className="nexus-company-map__primary-action">
                Stage mission in HQ
              </ShellButton>
              <ShellButton onClick={copyForChatGpt}>
                {copyState === "copied" ? "Brief copied" : copyState === "blocked" ? "Copy blocked" : "Copy ChatGPT brief"}
              </ShellButton>
            </div>
            <p className="nexus-company-map__action-status" data-state={copyState} role="status" aria-live="polite">
              {copyState === "copied"
                ? "ChatGPT brief copied to the clipboard."
                : copyState === "blocked"
                  ? "Clipboard access was blocked by the browser."
                  : "HQ handoff is session-only. ChatGPT output remains copy-only."}
            </p>
          </div>
        </motion.article>

        <motion.aside
          key={`sources-${department.id}`}
          data-testid="nexus-company-source-map"
          className="nexus-company-map__sources"
          initial={reduceMotion ? false : { opacity: 0, x: 7 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="nexus-company-map__sources-header">
            <span>
              <TinyLabel>Source evidence</TinyLabel>
              <strong>Capability stack</strong>
            </span>
            <span>{sources.length}</span>
          </div>

          <div className="nexus-company-map__source-list">
            {sources.map((source) => {
              const isExternal = source.url.startsWith("http");

              return (
                <article key={source.id} className="nexus-company-map__source" data-kind={source.kind}>
                  <div className="nexus-company-map__source-meta">
                    <span>{SOURCE_KIND_LABELS[source.kind]}</span>
                    <span>{source.posture.replaceAll("_", " ")}</span>
                  </div>
                  <a
                    className="nexus-company-map__source-title"
                    href={source.url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                  >
                    <span>{source.label}</span>
                    <span aria-hidden="true">{isExternal ? "↗" : "→"}</span>
                  </a>
                  <p>{source.purpose}</p>
                  <details className="nexus-company-map__source-paths">
                    <summary>Platform paths</summary>
                    <dl>
                      <div>
                        <dt>Codex</dt>
                        <dd>{source.codexPath}</dd>
                      </div>
                      <div>
                        <dt>ChatGPT</dt>
                        <dd>{source.chatgptPath}</dd>
                      </div>
                    </dl>
                  </details>
                </article>
              );
            })}
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
