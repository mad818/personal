"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShellBadge, ShellButton, ShellStack } from "@/components/ui/shell";
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
  return <span style={{ fontSize: "10px", color: "var(--text3)", fontWeight: 800, textTransform: "uppercase" }}>{children}</span>;
}

export default function NexusCompanyMap() {
  const router = useRouter();
  const summary = useMemo(() => getCompanyMapSummary(), []);
  const [selectedId, setSelectedId] = useState(NEXUS_COMPANY_DEPARTMENTS[0].id);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "blocked">("idle");
  const department = getCompanyDepartment(selectedId);
  const sources = department.sourceIds.map(getCompanySource);
  const brief = buildCompanyMissionBrief(selectedId);

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
    <section data-testid="nexus-company-map" style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: "6px", maxWidth: "720px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone="accent">MAX control plane</ShellBadge>
            <ShellBadge tone="success">Existing five agents</ShellBadge>
            <ShellBadge tone="muted">No automatic installs</ShellBadge>
          </div>
          <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}>
            A Nexus-native operating map for the supplied “AI company” stack. Departments route to existing agents; external catalogs stay reviewed sources.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone="muted">{summary.departmentCount} departments</ShellBadge>
          <ShellBadge tone="muted">{summary.sourceCount} sources</ShellBadge>
          <ShellBadge tone="success">{summary.nativeOrAdaptedCount} native/adapted</ShellBadge>
          <ShellBadge tone="muted">{summary.translationRequiredCount} translate first</ShellBadge>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {NEXUS_COMPANY_DEPARTMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setSelectedId(item.id); setCopyState("idle"); }}
            aria-pressed={item.id === selectedId}
            style={{
              border: `1px solid ${item.id === selectedId ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "8px",
              padding: "8px 10px",
              background: item.id === selectedId ? "var(--surf3)" : "var(--surf)",
              color: "var(--text)",
              fontSize: "11px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "14px" }}>
        <article style={{ border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surf)", padding: "12px", display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gap: "5px" }}>
            <TinyLabel>{COMPANY_AGENT_NAMES[department.leadAgentId]} leads</TinyLabel>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "17px" }}>{department.label}</h3>
            <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}>{department.mission}</p>
          </div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {department.deliverables.map((deliverable) => <ShellBadge key={deliverable} tone="muted">{deliverable}</ShellBadge>)}
          </div>
          <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}><strong>Boundary:</strong> {department.boundary}</p>
          <div className="nexus-ops-action-cluster">
            <ShellButton onClick={openInHq}>Open mission in HQ</ShellButton>
            <ShellButton onClick={copyForChatGpt}>
              {copyState === "copied" ? "ChatGPT brief copied" : copyState === "blocked" ? "Copy blocked" : "Copy ChatGPT brief"}
            </ShellButton>
          </div>
        </article>

        <aside data-testid="nexus-company-source-map" style={{ border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surf2)", padding: "12px", display: "grid", gap: "10px", alignContent: "start" }}>
          <TinyLabel>Capability sources</TinyLabel>
          <ShellStack gap="8px">
            {sources.map((source) => (
              <article key={source.id} className="nexus-ops-brief-item">
                <span className="nexus-ops-brief-item__eyebrow">{SOURCE_KIND_LABELS[source.kind]} · {source.posture.replaceAll("_", " ")}</span>
                <a
                  className="nexus-ops-brief-item__title"
                  href={source.url}
                  target={source.url.startsWith("http") ? "_blank" : undefined}
                  rel={source.url.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {source.label}
                </a>
                <p className="nexus-ops-brief-item__summary">{source.purpose}</p>
                <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}><strong>Codex:</strong> {source.codexPath}</p>
                <p className="nexus-shell-copy nexus-shell-copy--compact" style={{ margin: 0 }}><strong>ChatGPT:</strong> {source.chatgptPath}</p>
              </article>
            ))}
          </ShellStack>
        </aside>
      </div>
    </section>
  );
}
