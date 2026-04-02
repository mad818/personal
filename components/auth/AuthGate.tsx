// ── components/auth/AuthGate ───────────────────────────────
// Authentication wrapper: secure local token gate.

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
  TOKEN_VALIDATION_TIMEOUT_MS,
  validateToken,
} from "@/lib/apiFetch";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

interface Props {
  children: React.ReactNode;
  initiallyAuthed?: boolean;
}

type AuthDiagnostics = {
  runtime: {
    online?: boolean;
    bootId?: string;
    startedAt?: string;
    ageSeconds?: number;
  };
  auth: {
    tokenConfigured?: boolean;
    authenticated?: boolean;
    cookiePresent?: boolean;
  };
  release?: {
    uiShellVersion?: string;
  };
};

async function probeAuthDiagnostics(timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/auth-diagnostics", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json().catch(() => null)) as AuthDiagnostics | null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default function AuthGate({
  children,
  initiallyAuthed = false,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mountedRef = useRef(true);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [authed, setAuthed] = useState(initiallyAuthed);
  const [runtimeOnline, setRuntimeOnline] = useState<boolean | null>(null);
  const [checkingRuntime, setCheckingRuntime] = useState(false);
  const [tokenRouteWarm, setTokenRouteWarm] = useState<
    "warming" | "ready" | "failed"
  >("warming");
  const [transientStatus, setTransientStatus] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [runtimeBootId, setRuntimeBootId] = useState("");
  const [runtimeAgeSeconds, setRuntimeAgeSeconds] = useState<number | null>(null);
  const [tokenConfigured, setTokenConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initiallyAuthed) {
      setAuthed(true);
      setRuntimeOnline(true);
    }
  }, [initiallyAuthed]);

  useEffect(() => {
    let active = true;

    probeAuthDiagnostics().then((payload) => {
      if (!active || !mountedRef.current) return;
      if (!payload) {
        setTokenRouteWarm("failed");
        setRuntimeOnline(false);
        return;
      }
      setTokenRouteWarm("ready");
      setRuntimeOnline(payload.runtime.online ?? true);
      setRuntimeBootId(payload.runtime.bootId ?? "");
      setRuntimeAgeSeconds(
        typeof payload.runtime.ageSeconds === "number"
          ? payload.runtime.ageSeconds
          : null,
      );
      setTokenConfigured(Boolean(payload.auth.tokenConfigured));
      if (payload.auth.authenticated) {
        setAuthed(true);
        setRuntimeOnline(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initiallyAuthed) return;

    const existing = getSessionToken();
    let active = true;

    if (existing) {
      clearSessionToken();
      validateToken(existing, {
        timeoutMs: TOKEN_VALIDATION_TIMEOUT_MS,
        persistOnSuccess: false,
      })
        .then((status) => {
          if (!active || !mountedRef.current) return;
          if (status === "ok") {
            setSessionToken(existing);
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
  }, [initiallyAuthed]);

  const checkRuntime = useCallback(async () => {
    if (checkingRuntime) return;
    setCheckingRuntime(true);
    try {
      const payload = await probeAuthDiagnostics();
      if (mountedRef.current) {
        if (!payload) {
          setRuntimeOnline(false);
          setTokenRouteWarm("failed");
          setTransientStatus("Runtime diagnostics are unreachable.");
          return;
        }
        setRuntimeOnline(payload.runtime.online ?? true);
        setTokenRouteWarm("ready");
        setRuntimeBootId(payload.runtime.bootId ?? "");
        setRuntimeAgeSeconds(
          typeof payload.runtime.ageSeconds === "number"
            ? payload.runtime.ageSeconds
            : null,
        );
        setTokenConfigured(Boolean(payload.auth.tokenConfigured));
        setTransientStatus("Runtime diagnostics refreshed.");
      }
    } finally {
      if (mountedRef.current) {
        setCheckingRuntime(false);
      }
    }
  }, [checkingRuntime]);

  const handleNativeSubmit = useCallback(() => {
    if (mountedRef.current) {
      setSubmitting(true);
      setTransientStatus("Submitting secure local login...");
    }
  }, []);

  const handleSubmitIntent = useCallback(() => {
    if (submitting) return;
    formRef.current?.requestSubmit();
  }, [submitting]);

  if (authed) return <>{children}</>;

  const destination = pathname === "/" ? getDefaultEntrypoint() : pathname;
  const authErrorCode = searchParams.get("authError");
  const authErrorMessage =
    authErrorCode === "invalid"
      ? "Invalid token. Check your .env.local NEXUS_TOKEN."
      : authErrorCode === "server"
        ? "Token validation is not configured on the server."
        : "";

  const statusLine =
    authErrorMessage ||
    transientStatus ||
    "Token validation happens locally against your server.";
  const runtimeBootLabel = runtimeBootId ? runtimeBootId.slice(0, 8) : "unknown";

  return (
    <div
      data-testid="auth-gate"
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: "url(/theme/aegis-cosmos.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          opacity: 0.45,
          filter: "blur(2px) saturate(1.05)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `
          radial-gradient(circle at 18% 20%, rgba(103, 232, 249, 0.18), transparent 32%),
          radial-gradient(circle at 82% 14%, rgba(245, 158, 11, 0.16), transparent 24%),
          linear-gradient(120deg, rgba(5, 10, 16, 0.96) 0%, rgba(7, 13, 20, 0.82) 42%, rgba(4, 9, 15, 0.98) 100%)
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
              "linear-gradient(135deg, rgba(7,15,23,0.94) 0%, rgba(4,10,16,0.82) 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url(/theme/citadel.svg)",
              backgroundSize: "cover",
              backgroundPosition: "center center",
              transform: "scale(1.01)",
              filter: "saturate(1.08) contrast(1.04) brightness(0.92)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(140deg, rgba(4,8,12,0.06) 0%, rgba(4,8,12,0.42) 42%, rgba(4,8,12,0.9) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 20%, rgba(125,211,252,0.2), transparent 16%), radial-gradient(circle at 56% 38%, rgba(96,165,250,0.11), transparent 20%), radial-gradient(circle at 64% 72%, rgba(245,158,11,0.12), transparent 28%)",
              mixBlendMode: "screen",
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
                  background: "rgba(8, 16, 24, 0.62)",
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
                Local-first command lattice
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "stretch",
                }}
              >
                {[
                  "/theme/citadel.svg",
                  "/theme/vector.svg",
                  "/theme/spectra.svg",
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
                      alt="Aegis Vector surface schematic"
                      width={108}
                      height={136}
                      sizes="(max-width: 900px) 25vw, 108px"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
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
                  background: "rgba(8, 16, 24, 0.62)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(208, 239, 255, 0.84)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  backdropFilter: "blur(16px)",
                }}
              >
                Citadel ingress
              </div>
              <div
                style={{
                  fontSize: "clamp(42px, 6vw, 72px)",
                  lineHeight: 0.94,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  color: "#ecfeff",
                  textWrap: "balance",
                  textShadow: "0 10px 36px rgba(0,0,0,.28)",
                }}
              >
                {BRAND_NAME}
                <br />
                enters the grid.
              </div>
              <div
                style={{
                  color: "rgba(214, 238, 247, 0.78)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "420px",
                }}
              >
                Authenticate into a hardened local command shell with orbital
                telemetry, stable routes, and a free-first operator posture.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            width: "min(420px, 100%)",
            flex: "0 1 420px",
            background: "rgba(7, 14, 22, 0.9)",
            border: "1px solid rgba(103,232,249,0.16)",
            borderRadius: "28px",
            padding: "34px 28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            backdropFilter: "blur(22px)",
            boxShadow: "0 0 70px rgba(103,232,249,.08), 0 28px 70px rgba(0,0,0,.58)",
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
                background: "rgba(103,232,249,0.08)",
                border: "1px solid rgba(103,232,249,0.18)",
                color: "var(--text2)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: "14px" }}>🔐</span>
              Secure local operator gate
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
              Authorize the Citadel
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                maxWidth: "32ch",
              }}
            >
              Token validation stays local to this server. This flow uses a
              direct secure form submit so the real auth path reaches the
              server without extra client-side ceremony.
            </div>
          </div>

          <form
            ref={formRef}
            action="/auth/connect"
            method="POST"
            onSubmit={handleNativeSubmit}
            data-testid="auth-form"
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <input type="hidden" name="next" value={destination} />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                htmlFor="nexus-access-token"
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
                id="nexus-access-token"
                data-testid="auth-token-input"
                type="password"
                name="token"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your NEXUS_TOKEN…"
                autoFocus
                disabled={submitting}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  handleSubmitIntent();
                }}
                style={{
                  background: "rgba(26, 18, 20, 0.84)",
                  border: `1px solid ${authErrorMessage ? "var(--flo)" : "rgba(196,72,90,0.22)"}`,
                  borderRadius: "12px",
                  color: "var(--text)",
                  fontSize: "13px",
                  padding: "14px 15px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                  transition:
                    "border-color var(--t), box-shadow var(--t), opacity var(--t)",
                  opacity: submitting ? 0.72 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(196,72,90,0.55)";
                  e.currentTarget.style.boxShadow =
                    "0 0 18px rgba(196,72,90,.14)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = authErrorMessage
                    ? "var(--flo)"
                    : "rgba(196,72,90,0.22)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              <div
                aria-live="polite"
                data-testid="auth-status"
                style={{
                  minHeight: "18px",
                  fontSize: "11px",
                  color: authErrorMessage ? "var(--flo)" : "var(--text2)",
                }}
              >
                {statusLine}
              </div>

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
                    {tokenRouteWarm}
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

              {(authErrorMessage || runtimeOnline === false) && (
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
                      color: authErrorMessage ? "var(--flo)" : "var(--text2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {authErrorMessage ||
                      "The runtime looks offline. Verify the local server before trying again."}
                  </div>
                  <button
                    type="button"
                    onClick={checkRuntime}
                    disabled={checkingRuntime}
                    style={{
                      border: "1px solid rgba(103,232,249,0.22)",
                      background: "rgba(255,255,255,0.02)",
                      color: "var(--text2)",
                      borderRadius: "10px",
                      fontSize: "10px",
                      padding: "7px 10px",
                      cursor: checkingRuntime ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      opacity: checkingRuntime ? 0.55 : 1,
                    }}
                  >
                    {checkingRuntime ? "Checking..." : "Check runtime"}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmitIntent}
              data-testid="auth-submit"
              disabled={submitting}
              style={{
                height: "50px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #0891b2 0%, #f59e0b 100%)",
                border: "none",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 800,
                cursor: submitting ? "progress" : "pointer",
                transition: "all var(--t)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 12px 30px rgba(8,145,178,.28)",
                position: "relative",
                overflow: "hidden",
                opacity: submitting ? 0.82 : 1,
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
                {submitting ? "Connecting" : "Connect"}
                <span style={{ opacity: 0.84 }}>→</span>
              </span>
            </button>
          </form>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            {[ 
              {
                label: "runtime",
                value: runtimeOnline
                  ? "online"
                  : runtimeOnline === false
                    ? "offline"
                    : "checking",
              },
              { label: "route", value: tokenRouteWarm },
              {
                label: "state",
                value: submitting ? "submitting" : "native submit",
              },
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
            {BRAND_NAME} expects your NEXUS_TOKEN {tokenConfigured ? "configured in" : "in"}{" "}
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
            on the server. Runtime boot <strong>{runtimeBootLabel}</strong>
            {runtimeAgeSeconds !== null ? ` • ${runtimeAgeSeconds}s old` : ""}.
          </div>
        </section>
      </div>
    </div>
  );
}
