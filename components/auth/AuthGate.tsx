// ── components/auth/AuthGate ───────────────────────────────
// Authentication wrapper: redirects to /login if not authenticated.

"use client";

/**
 * AuthGate — Sadie Sink themed token gate.
 */

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSessionToken,
  getSessionToken,
  probeRuntimeHealth,
  TOKEN_VALIDATION_TIMEOUT_MS,
  validateAndStoreToken,
  validateToken,
} from "@/lib/apiFetch";
import { normalizeTokenCandidate } from "@/lib/authToken";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

interface Props {
  children: React.ReactNode;
}

async function warmTokenRouteRequest(timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/token", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok ? "ready" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timeout);
  }
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
  const [slowLoading, setSlowLoading] = useState(false);
  const [tokenRouteWarm, setTokenRouteWarm] = useState<
    "warming" | "ready" | "failed"
  >("warming");
  const submitAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const slowLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitWatchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearSubmitTimers = useCallback(() => {
    if (slowLoadingTimerRef.current) {
      clearTimeout(slowLoadingTimerRef.current);
      slowLoadingTimerRef.current = null;
    }
    if (submitWatchdogTimerRef.current) {
      clearTimeout(submitWatchdogTimerRef.current);
      submitWatchdogTimerRef.current = null;
    }
    if (mountedRef.current) {
      setSlowLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearSubmitTimers();
    };
  }, [clearSubmitTimers]);

  useEffect(() => {
    probeRuntimeHealth().then((ok) => {
      if (mountedRef.current) setRuntimeOnline(ok);
    });
  }, []);

  useEffect(() => {
    let active = true;
    warmTokenRouteRequest()
      .then((state) => {
        if (!active || !mountedRef.current) return;
        setTokenRouteWarm(state);
      })
      .catch(() => {
        if (active && mountedRef.current) setTokenRouteWarm("failed");
      });

    return () => {
      active = false;
    };
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
          if (!active || !mountedRef.current) return;
          if (status === "ok") {
            setAuthed(true);
            setRuntimeOnline(true);
            return;
          }
          clearSessionToken();
        })
        .catch(() => {
          clearSessionToken();
        });
    }

    return () => {
      active = false;
    };
  }, []);

  const submit = useCallback(async () => {
    const normalizedToken = normalizeTokenCandidate(token);
    if (!normalizedToken) {
      setError("Enter your access token.");
      setStatusMessage("");
      return;
    }
    if (loading) return;

    submitAttemptRef.current += 1;
    const attemptId = submitAttemptRef.current;
    clearSubmitTimers();
    setLoading(true);
    setSlowLoading(false);
    setError("");
    setStatusMessage("Checking token...");
    slowLoadingTimerRef.current = setTimeout(() => {
      if (attemptId !== submitAttemptRef.current || !mountedRef.current) return;
      setSlowLoading(true);
      setStatusMessage("Still checking your local token...");
    }, 3000);
    submitWatchdogTimerRef.current = setTimeout(() => {
      if (attemptId !== submitAttemptRef.current || !mountedRef.current) return;
      submitAttemptRef.current += 1;
      clearSubmitTimers();
      setLoading(false);
      setError(
        "Token check took too long. Retry now that the local verifier is awake.",
      );
      setStatusMessage("");
    }, 12000);
    try {
      if (tokenRouteWarm === "warming") {
        void warmTokenRouteRequest().then((warmState) => {
          if (!mountedRef.current) return;
          setTokenRouteWarm(warmState);
        });
      }

      const status = await Promise.race([
        validateAndStoreToken(normalizedToken),
        new Promise<Awaited<ReturnType<typeof validateAndStoreToken>>>(
          (resolve) => {
            window.setTimeout(() => resolve("unreachable"), 10000);
          },
        ),
      ]);

      // Ignore stale responses if a newer submit has already started.
      if (attemptId !== submitAttemptRef.current || !mountedRef.current) return;

      if (status === "ok") {
        const destination = pathname === "/" ? getDefaultEntrypoint() : pathname;
        setAuthed(true);
        setRuntimeOnline(true);
        setTokenRouteWarm("ready");
        setStatusMessage("Validated. Entering Nexus...");
        setLoading(false);
        clearSubmitTimers();
        if (destination !== pathname) {
          router.replace(destination);
        }
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
      clearSubmitTimers();
      if (attemptId === submitAttemptRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [clearSubmitTimers, loading, pathname, router, token, tokenRouteWarm]);

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
      {/* Background wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: "url(/theme/sadie-cover.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          opacity: 0.24,
          filter: "blur(4px) saturate(0.9)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `
          radial-gradient(circle at 20% 20%, rgba(212, 126, 92, 0.18), transparent 32%),
          radial-gradient(circle at 82% 14%, rgba(196, 72, 90, 0.18), transparent 24%),
          linear-gradient(120deg, rgba(9, 6, 8, 0.94) 0%, rgba(9, 6, 8, 0.8) 42%, rgba(9, 6, 8, 0.96) 100%)
        `,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "min(1180px, calc(100vw - 32px))",
          minHeight: "min(780px, calc(100vh - 32px))",
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          position: "relative",
          zIndex: 2,
          pointerEvents: "auto",
        }}
      >
        <section
          style={{
            flex: "1 1 560px",
            minHeight: "480px",
            borderRadius: "28px",
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
            background:
              "linear-gradient(135deg, rgba(20,12,15,0.92) 0%, rgba(15,9,12,0.78) 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url(/theme/sadie-wide.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              transform: "scale(1.03)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(140deg, rgba(6,4,5,0.2) 0%, rgba(6,4,5,0.7) 55%, rgba(6,4,5,0.88) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  background: "rgba(13, 9, 11, 0.55)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text2)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  backdropFilter: "blur(16px)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background:
                      runtimeOnline === false
                        ? "var(--flo)"
                        : runtimeOnline
                          ? "#84d98d"
                          : "rgba(255,255,255,0.45)",
                    boxShadow:
                      runtimeOnline === false
                        ? "0 0 12px rgba(255,107,129,0.55)"
                        : runtimeOnline
                          ? "0 0 12px rgba(132,217,141,0.45)"
                          : "none",
                  }}
                />
                Local Intelligence Console
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "stretch",
                }}
              >
                {[
                  "/theme/sadie-armani.jpg",
                  "/theme/sadie-cover.jpg",
                  "/theme/sadie-portrait.jpg",
                ].map((src, index) => (
                  <div
                    key={src}
                    style={{
                      width: index === 2 ? "108px" : "84px",
                      height: index === 2 ? "136px" : "108px",
                      borderRadius: "18px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                      background: "rgba(0,0,0,0.25)",
                    }}
                  >
                    <Image
                      src={src}
                      alt="Sadie Sink editorial portrait"
                      width={108}
                      height={136}
                      sizes="(max-width: 900px) 25vw, 108px"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                maxWidth: "460px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "fit-content",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  background: "rgba(13, 9, 11, 0.55)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,232,234,0.82)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  backdropFilter: "blur(16px)",
                }}
              >
                Sadie Edition
              </div>
              <div
                style={{
                  fontSize: "clamp(42px, 6vw, 72px)",
                  lineHeight: 0.94,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  color: "#fff2f1",
                  textWrap: "balance",
                }}
              >
                Nexus Prime
                <br />
                after dark.
              </div>
              <div
                style={{
                  color: "rgba(255,226,228,0.74)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "420px",
                }}
              >
                Local-first access, moody editorial energy, and a cleaner command
                chamber entrance built around the Sadie image set already in the
                repo.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            width: "min(420px, 100%)",
            flex: "0 1 420px",
            background: "rgba(17, 13, 14, 0.88)",
            border: "1px solid rgba(196,72,90,0.22)",
            borderRadius: "28px",
            padding: "34px 28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            backdropFilter: "blur(22px)",
            boxShadow: "0 0 70px rgba(196,72,90,.08), 0 28px 70px rgba(0,0,0,.58)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                width: "fit-content",
                padding: "7px 11px",
                borderRadius: "999px",
                background: "rgba(196,72,90,0.08)",
                border: "1px solid rgba(196,72,90,0.18)",
                color: "var(--text2)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: "14px" }}>🔐</span>
              Secure local token gate
            </div>
            <div
              style={{
                fontWeight: 900,
                fontSize: "30px",
                lineHeight: 1,
                color: "var(--text)",
                letterSpacing: "-0.04em",
              }}
            >
              Connect to Nexus
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                maxWidth: "32ch",
              }}
            >
              Token validation stays local to this server. This screen only locks
              during a real token check and falls back if the browser request path
              misbehaves.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
              disabled={loading}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Paste your NEXUS_TOKEN…"
              autoFocus
              style={{
                background: loading
                  ? "rgba(22, 16, 17, 0.72)"
                  : "rgba(26, 18, 20, 0.84)",
                border: `1px solid ${error ? "var(--flo)" : loading ? "rgba(212,148,106,0.42)" : "rgba(196,72,90,0.22)"}`,
                borderRadius: "12px",
                color: "var(--text)",
                fontSize: "13px",
                padding: "14px 15px",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "monospace",
                transition: "border-color var(--t), box-shadow var(--t), opacity var(--t)",
                opacity: loading ? 0.72 : 1,
                cursor: loading ? "wait" : "text",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = loading
                  ? "rgba(212,148,106,0.42)"
                  : "rgba(196,72,90,0.55)";
                e.currentTarget.style.boxShadow = loading
                  ? "0 0 0 transparent"
                  : "0 0 18px rgba(196,72,90,.14)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = error
                  ? "var(--flo)"
                  : loading
                    ? "rgba(212,148,106,0.42)"
                    : "rgba(196,72,90,0.22)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div
              aria-live="polite"
              style={{
                minHeight: "18px",
                fontSize: "11px",
                color: error ? "var(--flo)" : "var(--text2)",
              }}
            >
              {error ||
                statusMessage ||
                "Token validation happens locally against your server."}
            </div>
            {!error && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--text3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    verifier state
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color:
                        tokenRouteWarm === "ready"
                          ? "#84d98d"
                          : tokenRouteWarm === "failed"
                            ? "var(--flo)"
                            : "rgba(255,255,255,0.68)",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {loading
                      ? slowLoading
                        ? "slow"
                        : "checking"
                      : tokenRouteWarm}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    lineHeight: 1.45,
                  }}
                >
                  You can paste just the token value, a quoted value, or the full{" "}
                  <code
                    style={{
                      background: "var(--surf2)",
                      padding: "1px 4px",
                      borderRadius: "4px",
                      color: "var(--text2)",
                    }}
                  >
                    NEXUS_TOKEN=...
                  </code>{" "}
                  line.
                </div>
              </div>
            )}
            {(error || slowLoading || runtimeOnline === false) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "rgba(255,107,129,0.05)",
                  border: "1px solid rgba(255,107,129,0.14)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: error ? "var(--flo)" : "var(--text2)",
                    lineHeight: 1.5,
                  }}
                >
                  {error ||
                    "The checker is taking longer than expected. Retry or verify the local runtime."}
                </div>
                <button
                  type="button"
                  onClick={checkRuntime}
                  disabled={checkingRuntime || loading}
                  style={{
                    border: "1px solid rgba(196,72,90,0.34)",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text2)",
                    borderRadius: "10px",
                    fontSize: "10px",
                    padding: "7px 10px",
                    cursor:
                      checkingRuntime || loading ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    opacity: checkingRuntime || loading ? 0.55 : 1,
                  }}
                >
                  {checkingRuntime ? "Checking..." : "Check runtime"}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            style={{
              height: "50px",
              borderRadius: "14px",
              background: loading
                ? "linear-gradient(135deg, rgba(110,93,96,0.8) 0%, rgba(92,78,82,0.9) 100%)"
                : "linear-gradient(135deg, #c4485a 0%, #d4956a 100%)",
              border: "none",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 800,
              cursor: loading ? "wait" : "pointer",
              transition: "all var(--t)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: loading
                ? "0 0 0 transparent"
                : "0 12px 30px rgba(196,72,90,.28)",
              opacity: loading ? 0.88 : 1,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "relative",
                zIndex: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loading ? "Checking…" : "Connect"}
              <span style={{ opacity: loading ? 1 : 0.84 }}>
                {loading ? "●●●" : "→"}
              </span>
            </span>
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            {[
              { label: "runtime", value: runtimeOnline ? "online" : runtimeOnline === false ? "offline" : "checking" },
              { label: "route", value: tokenRouteWarm },
              { label: "state", value: loading ? "locked" : "ready" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text2)",
                    textTransform: "capitalize",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "var(--text3)",
              textAlign: "center",
              lineHeight: 1.6,
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
        </section>
      </div>
    </div>
  );
}
