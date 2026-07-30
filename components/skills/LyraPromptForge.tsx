"use client";

import { useMemo, useState } from "react";
import { callAIWithSystemPrompt } from "@/lib/ai";
import {
  assessLyraComplexity,
  buildLyraSystemPrompt,
  buildLyraUserMessage,
  parseLyraResponse,
  resolveLyraMode,
  validateLyraTarget,
  type LyraClarifyingQuestion,
  type LyraModeSelection,
  type LyraResultResponse,
  type LyraTarget,
} from "@/lib/promptOptimizer";
import {
  SectionLabel,
  ShellBadge,
  ShellButton,
  ShellStack,
} from "@/components/ui/shell";

const LYRA_WELCOME = `Hello! I'm Lyra, your AI prompt optimizer. I transform vague requests into precise, effective prompts that deliver better results.

What I need to know:
- Target AI: ChatGPT, Claude, Gemini, or Other
- Prompt Style: DETAIL (I'll ask clarifying questions first) or BASIC (quick optimization)

Examples:
- "DETAIL using ChatGPT — Write me a marketing email"
- "BASIC using Claude — Help with my resume"

Just share your rough prompt and I'll handle the optimization!`;

const TARGETS: Array<{ value: LyraTarget; label: string }> = [
  { value: "nexus", label: "Nexus / Universal" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "other", label: "Other" },
];

const MODES: Array<{ value: LyraModeSelection; label: string }> = [
  { value: "auto", label: "AUTO" },
  { value: "basic", label: "BASIC" },
  { value: "detail", label: "DETAIL" },
];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "10px 12px",
  background: "var(--surf2)",
  color: "var(--text)",
  font: "inherit",
  lineHeight: 1.5,
};

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <strong style={{ color: "var(--text)", fontSize: "12px" }}>
        {title}
      </strong>
      <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text2)" }}>
        {items.map((item) => (
          <li key={item} style={{ marginBottom: "4px", fontSize: "12px" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LyraPromptForge() {
  const [roughPrompt, setRoughPrompt] = useState("");
  const [target, setTarget] = useState<LyraTarget>("nexus");
  const [customTarget, setCustomTarget] = useState("");
  const [modeSelection, setModeSelection] = useState<LyraModeSelection>("auto");
  const [questions, setQuestions] = useState<LyraClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<LyraResultResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const assessment = useMemo(
    () => assessLyraComplexity(roughPrompt),
    [roughPrompt],
  );
  const resolvedMode = resolveLyraMode(modeSelection, assessment);

  const resetRun = () => {
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError("");
    setCopyState("idle");
  };

  const handlePromptChange = (value: string) => {
    setRoughPrompt(value);
    resetRun();
  };

  const handleTargetChange = (value: LyraTarget) => {
    setTarget(value);
    resetRun();
  };

  const handleModeChange = (value: LyraModeSelection) => {
    setModeSelection(value);
    resetRun();
  };

  const optimize = async () => {
    const cleanPrompt = roughPrompt.trim();
    if (!cleanPrompt) {
      setError("Add a rough prompt first.");
      return;
    }
    const targetError = validateLyraTarget(target, customTarget);
    if (targetError) {
      setError(targetError);
      return;
    }

    const needsQuestions = resolvedMode === "detail" && questions.length === 0;
    if (
      !needsQuestions &&
      questions.some((question) => !answers[question.id]?.trim())
    ) {
      setError("Answer each clarification question or switch to BASIC.");
      return;
    }

    const stage = needsQuestions ? "questions" : "result";
    const answerList = questions.map((question) => ({
      questionId: question.id,
      question: question.question,
      answer: answers[question.id]?.trim() ?? "",
    }));

    setBusy(true);
    setError("");
    setCopyState("idle");
    try {
      const raw = await callAIWithSystemPrompt({
        systemPrompt: buildLyraSystemPrompt({
          target,
          customTarget,
          mode: resolvedMode,
          stage,
        }),
        messages: [
          {
            role: "user",
            content: buildLyraUserMessage({
              roughPrompt: cleanPrompt,
              target,
              customTarget,
              mode: resolvedMode,
              answers: answerList,
            }),
          },
        ],
        maxTokens:
          stage === "questions" ? 600 : resolvedMode === "detail" ? 1800 : 1200,
        task:
          stage === "questions" || resolvedMode === "basic"
            ? "fast"
            : "reasoning",
      });
      if (!raw.trim()) throw new Error("empty response");
      const parsed = parseLyraResponse(raw, stage);
      if (parsed.kind === "questions") {
        setQuestions(parsed.questions);
        setAnswers({});
        setResult(null);
      } else {
        setResult(parsed);
      }
    } catch {
      setError(
        "LYRA could not produce a valid response. Check the active Nexus provider and retry.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.optimizedPrompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section
      data-testid="lyra-prompt-forge"
      style={{ display: "grid", gap: "14px" }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "16px",
          background:
            "radial-gradient(circle at top left, rgba(139, 92, 246, 0.16), transparent 42%), var(--surf)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone="accent">LYRA</ShellBadge>
          <ShellBadge tone="success">Session only</ShellBadge>
          <ShellBadge tone="muted">Copy, never auto-run</ShellBadge>
        </div>
        <p
          style={{
            margin: "14px 0 0",
            whiteSpace: "pre-line",
            color: "var(--text2)",
            fontSize: "12px",
            lineHeight: 1.65,
          }}
        >
          {LYRA_WELCOME}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "14px",
          alignItems: "start",
        }}
      >
        <ShellStack gap="12px">
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "14px",
              background: "var(--surf)",
            }}
          >
            <SectionLabel detail="Untrusted input transformed through the shared AI boundary">
              Rough prompt
            </SectionLabel>
            <textarea
              value={roughPrompt}
              onChange={(event) => handlePromptChange(event.target.value)}
              rows={9}
              placeholder="Describe the prompt you want LYRA to improve…"
              aria-label="Rough prompt"
              style={{ ...fieldStyle, resize: "vertical", marginTop: "10px" }}
            />
          </div>

          {questions.length > 0 ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: "14px",
                background: "var(--surf)",
                display: "grid",
                gap: "12px",
              }}
            >
              <SectionLabel detail="DETAIL mode needs only context that changes the result">
                Clarify
              </SectionLabel>
              {questions.map((question, index) => (
                <label
                  key={question.id}
                  style={{ display: "grid", gap: "6px", fontSize: "12px" }}
                >
                  <span style={{ color: "var(--text)" }}>
                    {index + 1}. {question.question}
                  </span>
                  <input
                    value={answers[question.id] ?? ""}
                    onChange={(event) => {
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }));
                      setError("");
                    }}
                    placeholder={question.placeholder}
                    style={fieldStyle}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </ShellStack>

        <ShellStack gap="12px">
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "14px",
              background: "var(--surf2)",
              display: "grid",
              gap: "12px",
            }}
          >
            <SectionLabel detail="Output dialect, not provider selection">
              Optimization controls
            </SectionLabel>
            <label style={{ display: "grid", gap: "6px", fontSize: "11px" }}>
              <span style={{ color: "var(--text3)", fontWeight: 800 }}>
                TARGET AI
              </span>
              <select
                value={target}
                onChange={(event) =>
                  handleTargetChange(event.target.value as LyraTarget)
                }
                style={fieldStyle}
              >
                {TARGETS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {target === "other" ? (
              <input
                value={customTarget}
                onChange={(event) => {
                  setCustomTarget(event.target.value);
                  resetRun();
                }}
                placeholder="Target AI name"
                aria-label="Custom target AI"
                style={fieldStyle}
              />
            ) : null}

            <div style={{ display: "grid", gap: "7px" }}>
              <span
                style={{
                  color: "var(--text3)",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                MODE
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {MODES.map((item) => (
                  <ShellButton
                    key={item.value}
                    active={modeSelection === item.value}
                    onClick={() => handleModeChange(item.value)}
                  >
                    {item.label}
                  </ShellButton>
                ))}
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px",
                background: "var(--surf)",
                display: "grid",
                gap: "6px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <strong style={{ fontSize: "12px", color: "var(--text)" }}>
                  {resolvedMode.toUpperCase()}
                </strong>
                {modeSelection === "auto" ? (
                  <ShellBadge tone="muted">
                    Auto · score {assessment.score}
                  </ShellBadge>
                ) : (
                  <ShellBadge tone="accent">Override</ShellBadge>
                )}
              </div>
              {assessment.reasons.map((reason) => (
                <span
                  key={reason}
                  style={{ color: "var(--text3)", fontSize: "10px" }}
                >
                  {reason}
                </span>
              ))}
            </div>

            <ShellButton
              onClick={optimize}
              disabled={busy || !roughPrompt.trim()}
            >
              {busy
                ? "LYRA is optimizing…"
                : questions.length > 0
                  ? "Optimize with answers"
                  : resolvedMode === "detail"
                    ? "Ask clarifying questions"
                    : "Optimize prompt"}
            </ShellButton>
            <p
              style={{
                margin: 0,
                color: "var(--text3)",
                fontSize: "10px",
                lineHeight: 1.5,
              }}
            >
              Content stays in this mounted panel. The active Nexus provider and
              Privacy Shield still govern processing.
            </p>
            {error ? (
              <p
                role="alert"
                style={{ margin: 0, color: "var(--fhi)", fontSize: "11px" }}
              >
                {error}
              </p>
            ) : null}
          </div>
        </ShellStack>
      </div>

      {result ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "14px",
            background: "var(--surf)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <SectionLabel detail="Ready to paste into the selected target">
              Optimized prompt
            </SectionLabel>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {copyState === "copied" ? (
                <ShellBadge tone="success">Copied</ShellBadge>
              ) : null}
              {copyState === "failed" ? (
                <ShellBadge tone="muted">Copy failed</ShellBadge>
              ) : null}
              <ShellButton onClick={copyPrompt}>Copy prompt</ShellButton>
            </div>
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px",
              background: "var(--surf2)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: "12px",
              lineHeight: 1.65,
            }}
          >
            {result.optimizedPrompt}
          </pre>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <ResultList title="Key improvements" items={result.improvements} />
            <ResultList title="Techniques applied" items={result.techniques} />
            <ResultList title="Assumptions" items={result.assumptions} />
          </div>
          <p style={{ margin: 0, color: "var(--text2)", fontSize: "12px" }}>
            <strong style={{ color: "var(--text)" }}>Pro tip:</strong>{" "}
            {result.proTip}
          </p>
        </div>
      ) : null}
    </section>
  );
}
