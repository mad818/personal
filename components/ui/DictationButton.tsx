"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const candidate =
    (window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    }).SpeechRecognition ??
    (window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    }).webkitSpeechRecognition;
  return candidate ?? null;
}

export default function DictationButton({
  onTranscript,
  title = "Dictate",
}: {
  onTranscript: (text: string) => void;
  title?: string;
}) {
  const recognitionRef = useRef<InstanceType<NonNullable<ReturnType<typeof getRecognitionCtor>>> | null>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  useEffect(
    () => () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Silent cleanup.
      }
    },
    [],
  );

  if (!supported) return null;

  return (
    <button
      type="button"
      title={listening ? "Stop dictation" : title}
      aria-label={listening ? "Stop dictation" : title}
      onClick={() => {
        if (listening) {
          recognitionRef.current?.stop();
          setListening(false);
          return;
        }
        const Recognition = getRecognitionCtor();
        if (!Recognition) return;
        const recognition = new Recognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .flatMap((result) => Array.from(result))
            .map((entry) => entry.transcript)
            .join(" ")
            .trim();
          if (transcript) onTranscript(transcript);
        };
        recognition.onerror = () => {
          setListening(false);
        };
        recognition.onend = () => {
          setListening(false);
        };
        recognitionRef.current = recognition;
        setListening(true);
        recognition.start();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "999px",
        border: "1px solid var(--border)",
        background: listening ? "rgba(200, 80, 80, 0.2)" : "rgba(10, 15, 30, 0.58)",
        color: "var(--text)",
        cursor: "pointer",
      }}
    >
      {listening ? "■" : "Mic"}
    </button>
  );
}
