"use client";

import { useEffect, useState } from "react";
import { PERSISTED_SHELL_STATE_NOTICE_KEY } from "@/lib/persistedShellState";

type RepairNotice = {
  healed?: string[];
  cleared?: string[];
  ts?: number;
};

function buildNoticeText(payload: RepairNotice) {
  const healed = payload.healed ?? [];
  const cleared = payload.cleared ?? [];
  if (healed.length && cleared.length) {
    return "Recovered stale local shell state and cleared invalid browser cache entries.";
  }
  if (healed.length) {
    return "Recovered stale local shell state before the shell booted.";
  }
  return "Cleared invalid local shell state before the shell booted.";
}

export default function PersistedShellStateNotice() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(
        PERSISTED_SHELL_STATE_NOTICE_KEY,
      );
      if (!raw) return;
      window.sessionStorage.removeItem(PERSISTED_SHELL_STATE_NOTICE_KEY);
      const parsed = JSON.parse(raw) as RepairNotice;
      const changed =
        (parsed.healed?.length ?? 0) > 0 || (parsed.cleared?.length ?? 0) > 0;
      if (!changed) return;
      setMessage(buildNoticeText(parsed));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => {
      setMessage("");
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      data-testid="persisted-shell-state-notice"
      style={{
        position: "fixed",
        top: "calc(var(--top-rail-height) + 10px)",
        right: "16px",
        zIndex: 210,
        maxWidth: "min(420px, calc(100vw - 32px))",
        borderRadius: "18px",
        border: "1px solid rgba(103,232,249,0.18)",
        background:
          "linear-gradient(180deg, rgba(8,14,24,0.96), rgba(6,11,20,0.98))",
        boxShadow: "0 20px 50px rgba(0,0,0,0.42)",
        padding: "12px 14px",
        color: "var(--text2)",
        fontSize: "12px",
        lineHeight: 1.55,
      }}
    >
      {message}
    </div>
  );
}
