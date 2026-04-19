// ── components/command/ProjectStackCard.tsx ────────────────────────────────────
// Shows the static project stack context injected into agent prompts.
"use client";
import { useState } from "react";
import { detectProjectContextSync } from "@/lib/projectContext";
import { ShellBadge } from "@/components/ui/shell";

export function ProjectStackCard() {
  const [expanded, setExpanded] = useState(false);

  // Safe: synchronous getter — returns the current local stack context block.
  const ctx = detectProjectContextSync();

  if (!ctx) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <button
        className="flex w-full items-center justify-between text-[var(--text2)] hover:text-[var(--text)]"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-mono font-semibold tracking-wider">STACK CONTEXT</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1">
            {ctx.stack.map((s) => (
              <span
                key={s}
                className="rounded bg-[var(--surf3)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent)]"
              >
                {s}
              </span>
            ))}
          </div>

          <div>
            <p className="mb-1 font-mono text-[10px] text-[var(--text3)] uppercase tracking-widest">
              Prompt Context
            </p>
            <ul className="space-y-1">
              {ctx.patterns.map((p) => (
                <li key={p.name} className="text-[var(--text2)]">
                  <span className="text-[var(--accent)]">{p.name}:</span>{" "}
                  {p.description}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-mono text-[10px] text-[var(--text3)] uppercase tracking-widest">
              Constraints
            </p>
            <ul className="space-y-0.5">
              {ctx.constraints.map((c) => (
                <li key={c} className="text-[var(--text2)]">
                  <span className="text-[var(--text3)]">•</span> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <ShellBadge tone="muted">Internal</ShellBadge>
              <ShellBadge tone="accent">Static context</ShellBadge>
            </div>
            <p className="font-mono text-[9px] text-[var(--text3)]">
              This card reflects the current hardcoded Nexus project context block,
              not package-level runtime detection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
