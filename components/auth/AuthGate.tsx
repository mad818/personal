// ── components/auth/AuthGate ───────────────────────────────
// Authentication wrapper: redirects to /login if not authenticated.

"use client";

/**
 * AuthGate — Sadie Sink themed token gate.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getSessionToken,
  probeRuntimeHealth,
  TOKEN_VALIDATION_TIMEOUT_MS,
  validateAndStoreToken,
  validateToken,
} from "@/lib/apiFetch";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

interface Props {
  children: React.ReactNode;
}

export default function AuthGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [runtimeOnline, setRuntimeOnline] = useState<boolean | null>(null);
  const [checkingRuntime, setCheckingRuntime] = useState(false);
  const submitAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    probeRuntimeHealth().then((ok) => {
      if (mountedRef.current) setRuntimeOnline(ok);
    });
  }, []);

  useEffect(() => {
    const existing = getSessionToken();
    let active = true;

    if (existing) {
      validateToken(existing, {
        timeoutMs: TOKEN_VALIDATION_TIMEOUT_MS,
        persistOnSuccess: false,
      })
        .then((status) => {
          if (active && mountedRef.current) setAuthed(status === "ok");
        })
        .catch(() => {
          // Keep lock screen if validation fails or times out.
        });
    }

    return () => {
      active = false;
    };
  }, []);

  const submit = useCallback(async () => {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      setError("Enter your access token.");
      setStatusMessage("");
      return;
    }
    if (loading) return;

    submitAttemptRef.current += 1;
    const attemptId = submitAttemptRef.current;
    setLoading(true);
    setError("");
    setStatusMessage("Checking token...");
    try {
      const status = await validateAndStoreToken(normalizedToken);

      // Ignore stale responses if a newer submit has already started.
      if (attemptId !== submitAttemptRef.current || !mountedRef.current) return;

      if (status === "ok") {
        const destination = pathname === "/" ? getDefaultEntrypoint() : pathname;
        setAuthed(true);
        setRuntimeOnline(true);
        setStatusMessage("Validated. Entering Nexus...");
        router.replace(destination);
        router.refresh();
      } else if (status === "invalid") {
        setError("Invalid token. Check your .env.local NEXUS_TOKEN.");
        setRuntimeOnline(true);
        setStatusMessage("");
      } else if (status === "rate_limited") {
        setError("Too many token attempts. Wait a few minutes and try again.");
        setRuntimeOnline(true);
        setStatusMessage("");
      } else if (status === "server_error") {
        setError("Token validation is not configured on the server.");
        setRuntimeOnline(false);
        setStatusMessage("");
      } else {
        setError(
          "Token check could not reach the server. Is desktop runtime running?",
        );
        setRuntimeOnline(false);
        setStatusMessage("");
      }
    } finally {
      if (attemptId === submitAttemptRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loading, pathname, router, token]);

  const checkRuntime = useCallback(async () => {
    if (checkingRuntime) return;
    setCheckingRuntime(true);
    try {
      const ok = await probeRuntimeHealth();
      if (mountedRef.current) {
        setRuntimeOnline(ok);
        if (ok) setError("");
        if (ok) setStatusMessage("Runtime reachable. Try Connect again.");
      }
    } finally {
      if (mountedRef.current) {
        setCheckingRuntime(false);
      }
    }
  }, [checkingRuntime]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  // Authenticated — show the app
  if (authed) return <>{children}</>;

  // Lock screen — Sadie Sink themed
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: "url(/theme/sadie-portrait.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
          opacity: 0.2,
          filter: "blur(1px) saturate(0.7)",
          pointerEvents: "none",
        }}
      />
      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `
          radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, var(--bg) 80%),
          linear-gradient(180deg, rgba(10,7,8,.4) 0%, rgba(10,7,8,.9) 100%)
        `,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "380px",
          background: "rgba(17, 13, 14, 0.85)",
          border: "1px solid rgba(196,72,90,0.2)",
          borderRadius: "16px",
          padding: "36px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 60px rgba(196,72,90,.08), 0 25px 60px rgba(0,0,0,.6)",
          position: "relative",
          zIndex: 2,
          pointerEvents: "auto",
        }}
      >
        {/* Logo / title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "32px",
              marginBottom: "8px",
              filter: "drop-shadow(0 0 8px rgba(196,72,90,.4))",
            }}
          >
            🔐
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: "20px",
              color: "var(--text)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #f5e6ea, #c4485a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            NEXUS PRIME
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text2)",
              marginTop: "6px",
              fontStyle: "italic",
            }}
          >
            Enter your access token to continue
          </div>
        </div>

        {/* Token input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Paste your NEXUS_TOKEN…"
            autoFocus
            style={{
              background: "rgba(26, 18, 20, 0.8)",
              border: `1px solid ${error ? "var(--flo)" : "rgba(196,72,90,0.2)"}`,
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "13px",
              padding: "11px 14px",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "monospace",
              transition: "border-color var(--t), box-shadow var(--t)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(196,72,90,0.5)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(196,72,90,.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error
                ? "var(--flo)"
                : "rgba(196,72,90,0.2)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <div
            aria-live="polite"
            style={{
              minHeight: "16px",
              fontSize: "11px",
              color: error ? "var(--flo)" : "var(--text2)",
            }}
          >
            {error || statusMessage || "Token validation happens locally against your server."}
          </div>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--flo)" }}>
                {error}
              </span>
              {runtimeOnline === false && (
                <button
                  type="button"
                  onClick={checkRuntime}
                  disabled={checkingRuntime}
                  style={{
                    border: "1px solid rgba(196,72,90,0.4)",
                    background: "transparent",
                    color: "var(--text2)",
                    borderRadius: "6px",
                    fontSize: "10px",
                    padding: "4px 8px",
                    cursor: checkingRuntime ? "wait" : "pointer",
                  }}
                >
                  {checkingRuntime ? "Checking..." : "Check runtime"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          style={{
            height: "40px",
            borderRadius: "8px",
            background: loading
              ? "var(--border2)"
              : "linear-gradient(135deg, #c4485a 0%, #d4956a 100%)",
            border: "none",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all var(--t)",
            letterSpacing: "0.5px",
            boxShadow: loading ? "none" : "0 4px 20px rgba(196,72,90,.25)",
          }}
        >
          {loading ? "Checking…" : "Connect"}
        </button>

        <div
          style={{
            fontSize: "11px",
            color: "var(--text3)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Your NEXUS_TOKEN is set in{" "}
          <code
            style={{
              background: "var(--surf2)",
              padding: "1px 5px",
              borderRadius: "4px",
              color: "var(--text2)",
            }}
          >
            .env.local
          </code>{" "}
          on the server.
        </div>
      </div>
    </div>
  );
}
