// ── components/ui/SpeakButton.tsx ────────────────────────────────────────────
// Zero-dependency text-to-speech using the browser's built-in Web Speech API.
// No API key. No external service. Works offline. Free.
//
// Chrome note: Chrome's neural (enhanced) voices may route through Google
// servers. Firefox and Edge use local OS voices by default.
// Users can select voices and opt out of enhanced voices in Settings.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";

interface SpeakButtonProps {
  /** The text to speak. Will be trimmed and stripped of markdown symbols. */
  text: string;
  /** Optional max characters to speak (default: 1200 — ~90s at normal rate). */
  maxChars?: number;
  /** Size variant */
  size?: "sm" | "md";
}

// Strip common markdown syntax before speaking
function cleanForSpeech(text: string, maxChars: number): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block. ") // code blocks
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1)) // inline code — read content
    .replace(/#{1,6}\s/g, "") // headers
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links — read label
    .replace(/•\s*/g, ". ") // bullets
    .replace(/\n{2,}/g, ". ") // double newlines → pause
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

// ── SpeakButton ───────────────────────────────────────────────────────────────
export function SpeakButton({
  text,
  maxChars = 1200,
  size = "sm",
}: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Read voice prefs from settings if present; fall back to browser defaults
  const voiceSettings = useStore((s) => ({
    speakRate: (s.settings as Record<string, unknown>).speakRate as
      | number
      | undefined,
    speakPitch: (s.settings as Record<string, unknown>).speakPitch as
      | number
      | undefined,
    speakVoice: (s.settings as Record<string, unknown>).speakVoice as
      | string
      | undefined,
  }));

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!supported || typeof window === "undefined") return;

    // If already speaking, stop
    if (speaking) {
      stop();
      return;
    }

    const cleaned = cleanForSpeech(text, maxChars);
    if (!cleaned) return;

    const utter = new SpeechSynthesisUtterance(cleaned);

    // Apply user preferences
    utter.rate = voiceSettings.speakRate ?? 1.0;
    utter.pitch = voiceSettings.speakPitch ?? 1.0;

    // Select voice by name if stored
    if (voiceSettings.speakVoice) {
      const voices = window.speechSynthesis.getVoices();
      const found = voices.find((v) => v.name === voiceSettings.speakVoice);
      if (found) utter.voice = found;
    }

    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    utteranceRef.current = utter;
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [supported, speaking, stop, text, maxChars, voiceSettings]);

  // Clean up on unmount
  useEffect(
    () => () => {
      stop();
    },
    [stop],
  );

  if (!supported) return null;

  const dim = size === "sm" ? 20 : 24;
  const iconSize = size === "sm" ? 11 : 13;

  return (
    <button
      onClick={speak}
      title={speaking ? "Stop speaking" : "Read aloud"}
      aria-label={speaking ? "Stop speaking" : "Read aloud"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: "50%",
        border: "none",
        background: speaking ? "var(--accent)" : "var(--surf3)",
        color: speaking ? "#fff" : "var(--text2)",
        cursor: "pointer",
        flexShrink: 0,
        transition:
          "background var(--motion-fast), color var(--motion-fast), opacity var(--motion-fast), transform var(--motion-fast)",
        opacity: 0.75,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.75";
      }}
    >
      {speaking ? (
        // Stop icon
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <rect x="2" y="2" width="8" height="8" rx="1" />
        </svg>
      ) : (
        // Speaker icon
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path
            d="M2 4.5h2l3-3v9l-3-3H2z"
            fill="currentColor"
            stroke="none"
            opacity={0.9}
          />
          <path d="M8 4a3 3 0 0 1 0 4" />
          <path d="M9.5 2.5a5.5 5.5 0 0 1 0 7" />
        </svg>
      )}
    </button>
  );
}
