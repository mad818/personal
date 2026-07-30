"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  SectionLabel,
  ShellBadge,
  ShellButton,
  ShellSegmentedTabs,
} from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { takeSelectedFile } from "@/components/ui/fileInput";
import {
  BUILT_IN_PASSPHRASE_WORDS,
  classifyEntropyEstimate,
  CREDENTIAL_RESULT_CLEAR_MS,
  CUSTOM_WORD_LIST_MAX_BYTES,
  CUSTOM_WORD_LIST_MAX_WORDS,
  CUSTOM_WORD_LIST_MIN_WORDS,
  formatEntropyBits,
  generatePassphrase,
  generatePassword,
  parseCustomWordList,
  PASSPHRASE_MAX_WORDS,
  PASSPHRASE_MIN_WORDS,
  PASSPHRASE_SEPARATOR_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type PassphraseCase,
  type PasswordGeneratorOptions,
} from "@/lib/localCredentialGenerator";

type GeneratorMode = "password" | "passphrase";
type WordSource = "built-in" | "custom";
type FeedbackKind = "status" | "error";

interface GeneratedCredential {
  value: string;
  mode: GeneratorMode;
  entropyBits: number;
  detail: string;
  generatedAt: string;
}

const MODES: Array<{ id: GeneratorMode; label: string }> = [
  { id: "password", label: "Password" },
  { id: "passphrase", label: "Passphrase" },
];

const WORD_SOURCES: Array<{ id: WordSource; label: string }> = [
  { id: "built-in", label: "Built-in words" },
  { id: "custom", label: "Custom words" },
];

const PANEL_STYLE: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  background: "var(--surf2)",
};

const FIELD_STYLE: CSSProperties = {
  width: "100%",
  minWidth: 0,
  border: "1px solid var(--border)",
  borderRadius: "10px",
  background: "var(--surf3)",
  color: "var(--text)",
  padding: "10px 11px",
  font: "inherit",
};

const LABEL_STYLE: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "var(--text2)",
  fontSize: "12px",
};

const CHECKBOX_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "var(--text2)",
  fontSize: "12px",
};

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Credential generation could not complete.";
}

export default function LocalCredentialGeneratorPanel() {
  const [mode, setMode] = useState<GeneratorMode>("password");
  const [passwordOptions, setPasswordOptions] =
    useState<PasswordGeneratorOptions>({
      length: 20,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      requireEverySelectedSet: true,
      excludeAmbiguous: true,
      excludedCharacters: "",
    });
  const [wordCount, setWordCount] = useState(8);
  const [separator, setSeparator] = useState("-");
  const [passphraseCase, setPassphraseCase] = useState<PassphraseCase>("lower");
  const [wordSource, setWordSource] = useState<WordSource>("built-in");
  const [customWordText, setCustomWordText] = useState("");
  const [result, setResult] = useState<GeneratedCredential | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("status");
  const [feedback, setFeedback] = useState(
    "Choose a mode and generate a value locally.",
  );
  const fileReadSequence = useRef(0);

  const customWordStatus = useMemo(() => {
    if (!customWordText.trim()) return null;
    try {
      const words = parseCustomWordList(customWordText);
      return { ok: true as const, count: words.length, error: "" };
    } catch (error) {
      return { ok: false as const, count: 0, error: errorMessage(error) };
    }
  }, [customWordText]);

  const configurationKey = useMemo(
    () =>
      JSON.stringify({
        mode,
        passwordOptions,
        wordCount,
        separator,
        passphraseCase,
        wordSource,
        customWordText,
      }),
    [
      customWordText,
      mode,
      passphraseCase,
      passwordOptions,
      separator,
      wordCount,
      wordSource,
    ],
  );

  const clearResult = useCallback((message: string) => {
    setResult(null);
    setRevealed(false);
    setFeedbackKind("status");
    setFeedback(message);
  }, []);

  useEffect(() => {
    clearResult("Settings changed. Generate a new value when ready.");
  }, [clearResult, configurationKey]);

  useEffect(() => {
    if (!result) return;
    const timeout = window.setTimeout(() => {
      clearResult("Generated value cleared after two minutes.");
    }, CREDENTIAL_RESULT_CLEAR_MS);
    return () => window.clearTimeout(timeout);
  }, [clearResult, result]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearResult("Generated value cleared when the document was hidden.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [clearResult]);

  function patchPasswordOptions(patch: Partial<PasswordGeneratorOptions>) {
    setPasswordOptions((current) => ({ ...current, ...patch }));
  }

  function generate() {
    try {
      const generatedAt = new Date().toISOString();
      if (mode === "password") {
        const generated = generatePassword(passwordOptions);
        setResult({
          value: generated.value,
          mode,
          entropyBits: generated.entropyBits,
          detail: `${generated.alphabetSize} available characters · ${generated.selectedSetCount} selected sets`,
          generatedAt,
        });
      } else {
        const customWords =
          wordSource === "custom"
            ? parseCustomWordList(customWordText)
            : undefined;
        const generated = generatePassphrase({
          wordCount,
          separator,
          case: passphraseCase,
          customWords,
        });
        setResult({
          value: generated.value,
          mode,
          entropyBits: generated.entropyBits,
          detail: `${generated.wordCount} words · ${generated.wordListSize.toLocaleString()}-word source`,
          generatedAt,
        });
      }
      setRevealed(false);
      setFeedbackKind("status");
      setFeedback(
        "Generated locally with Web Crypto. Nothing was saved or sent.",
      );
    } catch (error) {
      setResult(null);
      setRevealed(false);
      setFeedbackKind("error");
      setFeedback(errorMessage(error));
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(result.value);
      setFeedbackKind("status");
      setFeedback(
        "Copied. The system clipboard is outside Nexus control and was not auto-cleared.",
      );
    } catch {
      setFeedbackKind("error");
      setFeedback(
        "Clipboard write failed. Retry in a secure browser context or select the revealed value manually.",
      );
    }
  }

  async function loadCustomWordFile(event: ChangeEvent<HTMLInputElement>) {
    const file = takeSelectedFile(event.currentTarget);
    if (!file) return;
    const sequence = fileReadSequence.current + 1;
    fileReadSequence.current = sequence;
    try {
      if (file.size > CUSTOM_WORD_LIST_MAX_BYTES) {
        throw new Error(
          `Word-list file must be at most ${CUSTOM_WORD_LIST_MAX_BYTES / 1_024} KiB.`,
        );
      }
      const text = await file.text();
      if (sequence !== fileReadSequence.current) return;
      const words = parseCustomWordList(text);
      setCustomWordText(text);
      setWordSource("custom");
      setFeedbackKind("status");
      setFeedback(
        `Loaded ${words.length.toLocaleString()} unique words into this in-memory session.`,
      );
    } catch (error) {
      if (sequence !== fileReadSequence.current) return;
      setFeedbackKind("error");
      setFeedback(errorMessage(error));
    }
  }

  const entropyClass = result
    ? classifyEntropyEstimate(result.entropyBits)
    : null;

  return (
    <div
      data-testid="local-credential-generator"
      style={{ display: "grid", gap: "14px" }}
    >
      <SurfaceCallout
        tone="warning"
        role="status"
        title="Generator only — not a password manager"
        description="Values exist only in this component session and clear after two minutes or when the document is hidden. Nexus does not store, sync, recover, autofill, validate, or breach-check credentials."
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionLabel detail="Web Crypto · memory only">
            Local credential generator
          </SectionLabel>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--text2)",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            Unbiased random selection, bounded inputs, and no network or
            persistence path.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone="success">Local only</ShellBadge>
          <ShellBadge tone="muted">
            {BUILT_IN_PASSPHRASE_WORDS.length.toLocaleString()} built-in words
          </ShellBadge>
        </div>
      </div>

      <ShellSegmentedTabs
        items={MODES}
        active={mode}
        onChange={setMode}
        minButtonWidth={132}
      />

      {mode === "password" ? (
        <section style={PANEL_STYLE} aria-labelledby="password-options-title">
          <SectionLabel detail="8-128 characters">
            <span id="password-options-title">Password options</span>
          </SectionLabel>

          <label style={LABEL_STYLE}>
            Length
            <input
              type="number"
              min={PASSWORD_MIN_LENGTH}
              max={PASSWORD_MAX_LENGTH}
              value={passwordOptions.length}
              onChange={(event) =>
                patchPasswordOptions({ length: Number(event.target.value) })
              }
              style={FIELD_STYLE}
            />
          </label>

          <fieldset
            style={{
              margin: 0,
              padding: 0,
              border: 0,
              display: "grid",
              gap: "8px",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            }}
          >
            <legend
              style={{
                color: "var(--text3)",
                fontSize: "11px",
                marginBottom: "8px",
              }}
            >
              Character sets
            </legend>
            {(
              [
                ["lowercase", "Lowercase a-z"],
                ["uppercase", "Uppercase A-Z"],
                ["digits", "Digits 0-9"],
                ["symbols", "Symbols"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={CHECKBOX_STYLE}>
                <input
                  type="checkbox"
                  checked={passwordOptions[key]}
                  onChange={(event) =>
                    patchPasswordOptions({ [key]: event.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>

          <label style={CHECKBOX_STYLE}>
            <input
              type="checkbox"
              checked={passwordOptions.requireEverySelectedSet}
              onChange={(event) =>
                patchPasswordOptions({
                  requireEverySelectedSet: event.target.checked,
                })
              }
            />
            Require at least one character from every selected set
          </label>

          <label style={CHECKBOX_STYLE}>
            <input
              type="checkbox"
              checked={passwordOptions.excludeAmbiguous}
              onChange={(event) =>
                patchPasswordOptions({
                  excludeAmbiguous: event.target.checked,
                })
              }
            />
            Exclude ambiguous characters such as I, l, 1, O, and 0
          </label>

          <label style={LABEL_STYLE}>
            Additional characters to exclude
            <input
              type="text"
              value={passwordOptions.excludedCharacters}
              maxLength={64}
              onChange={(event) =>
                patchPasswordOptions({
                  excludedCharacters: event.target.value,
                })
              }
              placeholder="Optional exact characters"
              style={FIELD_STYLE}
            />
          </label>
        </section>
      ) : (
        <section style={PANEL_STYLE} aria-labelledby="passphrase-options-title">
          <SectionLabel detail="4-16 words">
            <span id="passphrase-options-title">Passphrase options</span>
          </SectionLabel>

          <div
            style={{
              display: "grid",
              gap: "10px",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            }}
          >
            <label style={LABEL_STYLE}>
              Word count
              <input
                type="number"
                min={PASSPHRASE_MIN_WORDS}
                max={PASSPHRASE_MAX_WORDS}
                value={wordCount}
                onChange={(event) => setWordCount(Number(event.target.value))}
                style={FIELD_STYLE}
              />
            </label>
            <label style={LABEL_STYLE}>
              Separator
              <input
                type="text"
                value={separator}
                maxLength={PASSPHRASE_SEPARATOR_MAX_LENGTH}
                onChange={(event) => setSeparator(event.target.value)}
                placeholder="Hyphen, space, number, or word"
                style={FIELD_STYLE}
              />
            </label>
            <label style={LABEL_STYLE}>
              Word case
              <select
                value={passphraseCase}
                onChange={(event) =>
                  setPassphraseCase(event.target.value as PassphraseCase)
                }
                style={FIELD_STYLE}
              >
                <option value="lower">Lower case</option>
                <option value="upper">UPPER CASE</option>
                <option value="title">Title Case</option>
              </select>
            </label>
          </div>

          <ShellSegmentedTabs
            items={WORD_SOURCES}
            active={wordSource}
            onChange={setWordSource}
            minButtonWidth={132}
          />

          {wordSource === "built-in" ? (
            <SurfaceCallout
              tone="info"
              role="status"
              title="Project-owned compound words"
              description="The built-in source contains 1,024 original prefix-and-noun combinations, providing 10 random bits per selected word before formatting."
            />
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              <label style={LABEL_STYLE}>
                Paste custom words
                <textarea
                  value={customWordText}
                  onChange={(event) => setCustomWordText(event.target.value)}
                  rows={7}
                  maxLength={CUSTOM_WORD_LIST_MAX_BYTES}
                  aria-describedby="custom-word-list-guidance"
                  placeholder="One word per line, or separate with spaces, commas, or semicolons"
                  style={{ ...FIELD_STYLE, resize: "vertical" }}
                />
              </label>
              <p
                id="custom-word-list-guidance"
                style={{
                  margin: 0,
                  color: "var(--text3)",
                  fontSize: "11px",
                  lineHeight: 1.55,
                }}
              >
                {CUSTOM_WORD_LIST_MIN_WORDS}-
                {CUSTOM_WORD_LIST_MAX_WORDS.toLocaleString()} unique words, 2-32
                characters each, up to {CUSTOM_WORD_LIST_MAX_BYTES / 1_024} KiB.
                The list remains in memory only.
              </p>
              <label style={LABEL_STYLE}>
                Load local UTF-8 word-list file
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={loadCustomWordFile}
                  style={FIELD_STYLE}
                />
              </label>
              {customWordStatus ? (
                <p
                  role={customWordStatus.ok ? "status" : "alert"}
                  style={{
                    margin: 0,
                    color: customWordStatus.ok ? "var(--text2)" : "var(--flo)",
                    fontSize: "12px",
                  }}
                >
                  {customWordStatus.ok
                    ? `${customWordStatus.count.toLocaleString()} unique valid words ready.`
                    : customWordStatus.error}
                </p>
              ) : null}
            </div>
          )}
        </section>
      )}

      <section style={PANEL_STYLE} aria-labelledby="generated-value-title">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <SectionLabel
            detail={result ? `Generated ${result.generatedAt}` : "Memory only"}
          >
            <span id="generated-value-title">Generated value</span>
          </SectionLabel>
          {result && entropyClass ? (
            <ShellBadge
              tone={
                entropyClass === "strong" || entropyClass === "very-strong"
                  ? "success"
                  : entropyClass === "moderate"
                    ? "accent"
                    : "muted"
              }
            >
              Estimate {entropyClass.replace("-", " ")}
            </ShellBadge>
          ) : null}
        </div>

        <input
          type={revealed ? "text" : "password"}
          readOnly
          value={result?.value ?? ""}
          aria-label="Generated credential value"
          placeholder="Generate to create an in-memory value"
          style={{
            ...FIELD_STYLE,
            fontFamily: "var(--font-mono)",
            letterSpacing: revealed ? "normal" : "0.12em",
          }}
        />

        {result ? (
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              color: "var(--text2)",
              fontSize: "11px",
            }}
          >
            <span>
              {formatEntropyBits(result.entropyBits)} configuration estimate
            </span>
            <span>·</span>
            <span>{result.detail}</span>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellButton onClick={generate}>
            {result ? "Regenerate locally" : "Generate locally"}
          </ShellButton>
          <ShellButton
            onClick={() => setRevealed((current) => !current)}
            disabled={!result}
          >
            {revealed ? "Mask value" : "Reveal value"}
          </ShellButton>
          <ShellButton onClick={() => void copyResult()} disabled={!result}>
            Copy value
          </ShellButton>
          <ShellButton
            onClick={() => clearResult("Generated value cleared manually.")}
            disabled={!result}
          >
            Clear value
          </ShellButton>
        </div>

        <p
          role={feedbackKind === "error" ? "alert" : "status"}
          aria-live={feedbackKind === "error" ? "assertive" : "polite"}
          style={{
            margin: 0,
            minHeight: "20px",
            color: feedbackKind === "error" ? "var(--flo)" : "var(--text2)",
            fontSize: "12px",
            lineHeight: 1.55,
          }}
        >
          {feedback}
        </p>
      </section>

      <SurfaceCallout
        tone="info"
        role="status"
        title="Entropy is a configuration estimate"
        description="The estimate describes random choices and source size, not site policy, secrecy after copying, endpoint security, password reuse, compromise resistance, or an independent security audit."
      />
    </div>
  );
}
