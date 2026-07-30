"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { searchNexusCommands, type NexusCommand } from "@/lib/commandPalette";

type CommandPaletteProps = {
  open: boolean;
  accentColor: string;
  onClose: () => void;
  onActivate: (command: NexusCommand) => void;
};

export default function CommandPalette({
  open,
  accentColor,
  onClose,
  onActivate,
}: CommandPaletteProps) {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => searchNexusCommands(query), [query]);
  const activeResult =
    results[Math.min(activeIndex, Math.max(0, results.length - 1))] ?? null;
  const activeOptionId = activeResult
    ? `${listboxId}-${activeResult.command.id}`
    : undefined;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setQuery("");
      setActiveIndex(0);
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
      wasOpenRef.current = true;
      return () => window.clearTimeout(focusTimer);
    }

    if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open || !activeOptionId) return;
    document
      .getElementById(activeOptionId)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId, open]);

  const moveSelection = (direction: 1 | -1) => {
    if (results.length === 0) return;
    setActiveIndex((current) => {
      const next = current + direction;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, results.length - 1));
      return;
    }
    if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      onActivate(activeResult.command);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <section
      data-nexus-command-palette="true"
      role="dialog"
      aria-label="Nexus command palette"
      style={{
        position: "absolute",
        inset: "43px 0 0",
        zIndex: 5,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        minHeight: 0,
        background: "var(--surf)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "6px",
          padding: "10px",
          borderBottom: "1px solid var(--border)",
          background: `color-mix(in srgb, ${accentColor} 5%, var(--surf))`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <label
            htmlFor={inputId}
            style={{
              fontSize: "8px",
              fontWeight: 900,
              letterSpacing: ".14em",
              color: "var(--text2)",
            }}
          >
            COMMAND PALETTE
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              color: "var(--text3)",
              fontSize: "7px",
            }}
          >
            <span>Ctrl Shift P / Cmd P</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close command palette"
              style={{
                minWidth: "24px",
                minHeight: "22px",
                borderRadius: "5px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text2)",
                cursor: "pointer",
                fontSize: "9px",
              }}
            >
              ESC
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded="true"
          aria-activedescendant={activeOptionId}
          aria-label="Search Nexus commands"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search workplanes, tools, and views…"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: "36px",
            borderRadius: "8px",
            border: `1px solid ${accentColor}55`,
            background: "var(--surf3)",
            color: "var(--text)",
            padding: "0 10px",
            outline: "none",
            fontSize: "11px",
            fontFamily: "inherit",
          }}
        />
        <div
          aria-live="polite"
          style={{
            minHeight: "12px",
            fontSize: "8px",
            color: "var(--text3)",
          }}
        >
          {results.length === 0
            ? "No matching Nexus command."
            : `${results.length} command${results.length === 1 ? "" : "s"} available. Use arrow keys to preview.`}
        </div>
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Nexus commands"
        style={{
          minHeight: 0,
          overflowY: "auto",
          padding: "6px",
        }}
      >
        {results.map((result, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={result.command.id}
              id={`${listboxId}-${result.command.id}`}
              type="button"
              role="option"
              aria-selected={selected}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => onActivate(result.command)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "8px",
                alignItems: "center",
                padding: "7px 8px",
                borderRadius: "7px",
                border: selected
                  ? `1px solid ${accentColor}55`
                  : "1px solid transparent",
                background: selected
                  ? `color-mix(in srgb, ${accentColor} 11%, var(--surf2))`
                  : "transparent",
                color: "var(--text)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "10px",
                    fontWeight: 800,
                  }}
                >
                  {result.command.label}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "8px",
                    color: "var(--text3)",
                  }}
                >
                  {result.command.description}
                </span>
              </span>
              <span
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  padding: "2px 6px",
                  color: selected ? accentColor : "var(--text3)",
                  fontSize: "7px",
                  fontWeight: 800,
                  letterSpacing: ".08em",
                }}
              >
                {result.command.group}
              </span>
            </button>
          );
        })}
      </div>

      <div
        aria-label="Selected command preview"
        style={{
          minHeight: "72px",
          display: "grid",
          gap: "4px",
          padding: "8px 10px",
          borderTop: "1px solid var(--border)",
          background: "rgba(255,255,255,0.018)",
        }}
      >
        {activeResult ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <strong style={{ color: accentColor, fontSize: "9px" }}>
                {activeResult.command.label}
              </strong>
              <code style={{ color: "var(--text3)", fontSize: "7px" }}>
                {activeResult.command.href}
              </code>
            </div>
            <p
              style={{
                margin: 0,
                color: "var(--text2)",
                fontSize: "8px",
                lineHeight: 1.5,
              }}
            >
              {activeResult.command.description}
            </p>
            <span style={{ color: "var(--text3)", fontSize: "7px" }}>
              Enter to open · Escape to close
            </span>
          </>
        ) : (
          <p
            style={{
              margin: 0,
              alignSelf: "center",
              color: "var(--text3)",
              fontSize: "9px",
            }}
          >
            Try a workplane, capability, or mission term.
          </p>
        )}
      </div>
    </section>
  );
}
