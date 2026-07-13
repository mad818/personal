"use client";

import { useMemo, useState } from "react";
import { callAIWithSystemPrompt } from "@/lib/ai";
import {
  HUMAN_EDITOR_MAX_INPUT_CHARS,
  HUMAN_EDITOR_MODES,
  buildHumanEditorSystemPrompt,
  buildHumanEditorUserMessage,
  findHumanEditorViolations,
  normalizeHumanEditorInput,
  parseHumanEditorResponse,
  type HumanEditorMode,
} from "@/lib/humanEditor";
import {
  SectionLabel,
  ShellBadge,
  ShellButton,
  ShellStack,
} from "@/components/ui/shell";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "10px 12px",
  background: "var(--surf2)",
  color: "var(--text)",
  font: "inherit",
  lineHeight: 1.55,
  resize: "vertical",
};

export default function HumanEditorWorkbench() {
  const [mode, setMode] = useState<HumanEditorMode>("mega");
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const activeMode = useMemo(
    () => HUMAN_EDITOR_MODES.find((item) => item.id === mode) ?? HUMAN_EDITOR_MODES[0],
    [mode],
  );
  const violations = useMemo(
    () => (result ? findHumanEditorViolations(result) : []),
    [result],
  );

  const rewrite = async () => {
    const cleanText = normalizeHumanEditorInput(sourceText);
    if (!cleanText) {
      setError("Add the text you want rewritten.");
      return;
    }

    setBusy(true);
    setError("");
    setResult("");
    setCopyState("idle");
    try {
      const raw = await callAIWithSystemPrompt({
        systemPrompt: buildHumanEditorSystemPrompt(mode),
        messages: [
          {
            role: "user",
            content: buildHumanEditorUserMessage({ mode, text: cleanText }),
          },
        ],
        maxTokens: 1_800,
        task: "reasoning",
        secondBrainMode: "human-editor",
      });
      const rewritten = parseHumanEditorResponse(raw);
      if (!rewritten) throw new Error("empty response");
      setResult(rewritten);
    } catch {
      setError(
        "Human Editor could not complete the rewrite. Check the active local provider and the second-brain file status in VAULT.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section
      data-testid="human-editor-workbench"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "16px",
        background: "var(--surf)",
      }}
    >
      <ShellStack gap="14px">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone="accent">Human Editor</ShellBadge>
          <ShellBadge tone="success">File-backed protocol</ShellBadge>
          <ShellBadge tone="muted">Session only</ShellBadge>
          <ShellBadge tone="muted">No auto-save</ShellBadge>
        </div>

        <div>
          <SectionLabel detail="Mega combines all five rewrite rules and is the default">
            Rewrite mode
          </SectionLabel>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {HUMAN_EDITOR_MODES.map((item) => (
              <ShellButton
                key={item.id}
                active={mode === item.id}
                onClick={() => {
                  setMode(item.id);
                  setResult("");
                  setError("");
                  setCopyState("idle");
                }}
              >
                {item.label}
              </ShellButton>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", color: "var(--text3)", fontSize: "11px" }}>
            {activeMode.summary}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "14px",
            alignItems: "start",
          }}
        >
          <label style={{ display: "grid", gap: "7px" }}>
            <SectionLabel detail={`${sourceText.length}/${HUMAN_EDITOR_MAX_INPUT_CHARS} characters`}>
              Source text
            </SectionLabel>
            <textarea
              value={sourceText}
              onChange={(event) => {
                setSourceText(event.target.value.slice(0, HUMAN_EDITOR_MAX_INPUT_CHARS));
                setResult("");
                setError("");
                setCopyState("idle");
              }}
              rows={12}
              placeholder="Paste the post, email, paragraph, or other prose here."
              style={fieldStyle}
            />
            <ShellButton onClick={rewrite} disabled={busy || !sourceText.trim()}>
              {busy ? "Rewriting…" : `Rewrite with ${activeMode.label}`}
            </ShellButton>
          </label>

          <div style={{ display: "grid", gap: "7px" }}>
            <SectionLabel detail="Rewritten text only; nothing is saved to memory">
              Result
            </SectionLabel>
            <textarea
              value={result}
              readOnly
              rows={12}
              placeholder="The rewrite appears here."
              style={fieldStyle}
            />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <ShellButton onClick={copyResult} disabled={!result}>
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy rewrite"}
              </ShellButton>
              {violations.length ? (
                <ShellBadge tone="accent">
                  Protocol warning · {violations.join(", ")}
                </ShellBadge>
              ) : result ? (
                <ShellBadge tone="success">Banned phrases clear</ShellBadge>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div role="alert" style={{ color: "var(--flo)", fontSize: "12px" }}>
            {error}
          </div>
        ) : null}
      </ShellStack>
    </section>
  );
}
