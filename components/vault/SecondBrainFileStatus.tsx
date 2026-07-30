"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { ShellBadge, ShellButton } from "@/components/ui/shell";

interface SecondBrainFileRow {
  id: "index" | "human-editor" | "night-shift-skill" | "night-shift-rules";
  path: string;
  required: boolean;
  present: boolean;
  characterCount: number;
  loadedCharacterCount: number;
  truncated: boolean;
  modifiedAt: string | null;
}

interface SecondBrainStatusPayload {
  posture: "ready" | "degraded";
  authority: "human_files_over_ai_memory";
  aiWriteAuthority: false;
  files: SecondBrainFileRow[];
}

export default function SecondBrainFileStatus() {
  const [status, setStatus] = useState<SecondBrainStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadIssue("");
    try {
      const response = await apiFetch("/api/second-brain");
      const payload = (await response
        .json()
        .catch(() => null)) as SecondBrainStatusPayload | null;
      if (!response.ok || !payload) {
        setLoadIssue("Second-brain file status is unavailable.");
        return;
      }
      setStatus(payload);
    } catch {
      setLoadIssue("Second-brain file status is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div
      data-testid="second-brain-file-status"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "12px",
        background: "var(--surf2)",
        display: "grid",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <strong style={{ color: "var(--text)", fontSize: "12px" }}>
            File-first second brain
          </strong>
          <div
            style={{
              color: "var(--text3)",
              fontSize: "10px",
              marginTop: "3px",
            }}
          >
            Human files outrank AI memory. The AI has no background write
            authority.
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <ShellBadge tone={status?.posture === "ready" ? "success" : "accent"}>
            {loading ? "Checking" : (status?.posture ?? "Unavailable")}
          </ShellBadge>
          <ShellBadge tone="muted">Read-only context</ShellBadge>
          <ShellButton onClick={refresh} disabled={loading}>
            Refresh files
          </ShellButton>
        </div>
      </div>

      {status?.files.map((file) => (
        <div
          key={file.id}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "10px",
            padding: "9px 10px",
            border: "1px solid var(--border2)",
            borderRadius: "8px",
            background: "var(--surf)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "var(--text2)",
                fontSize: "11px",
                fontFamily: "monospace",
                overflowWrap: "anywhere",
              }}
            >
              {file.path}
            </div>
            <div
              style={{
                color: "var(--text3)",
                fontSize: "10px",
                marginTop: "3px",
              }}
            >
              {file.present
                ? `${file.loadedCharacterCount.toLocaleString()} characters loaded${
                    file.truncated ? " · bounded" : ""
                  }`
                : "Required file is missing"}
            </div>
          </div>
          <ShellBadge tone={file.present ? "success" : "accent"}>
            {file.present ? "Loaded" : "Missing"}
          </ShellBadge>
        </div>
      ))}

      {loadIssue ? (
        <div role="alert" style={{ color: "var(--flo)", fontSize: "11px" }}>
          {loadIssue}
        </div>
      ) : null}
    </div>
  );
}
