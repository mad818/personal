// ── components/auth/AuthGate ───────────────────────────────
// Authentication wrapper: secure local token gate.

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  clearSessionToken,
  getSessionToken,
  probeRuntimeHealth,
  TOKEN_VALIDATION_TIMEOUT_MS,
  validateToken,
} from "@/lib/apiFetch";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

interface Props {
  children: React.ReactNode;
  initiallyAuthed?: boolean;
}

async function probeTokenRoute(timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/token", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { routeState: "failed" as const, authenticated: false };
    }

    const payload = (await response.json().catch(() => null)) as
      | { authenticated?: boolean }
      | null;

    return {
      routeState: "ready" as const,
      authenticated: Boolean(payload?.authenticated),
    };
  } catch {
    return { routeState: "failed" as const, authenticated: false };
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

  const [authed, setAuthed] = useState(initiallyAuthed);
  const [runtimeOnline, setRuntimeOnline] = useState<boolean | null>(null);
  const [checkingRuntime, setCheckingRuntime] = useState(false);
  const [tokenRouteWarm, setTokenRouteWarm] = useState<
    "warming" | "ready" | "failed"
  >("warming");
  const [transientStatus, setTransientStatus] = useState("");
  const [tokenInput, setTokenInput] = useState("");

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
    probeRuntimeHealth().then((ok) => {
      if (mountedRef.current) setRuntimeOnline(ok);
    });
  }, []);

  useEffect(() => {
    let active = true;

    probeTokenRoute().then(({ routeState, authenticated }) => {
      if (!active || !mountedRef.current) return;
      setTokenRouteWarm(routeState);
      if (authenticated) {
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
  }, [initiallyAuthed]);

  const checkRuntime = useCallback(async () => {
    if (checkingRuntime) return;
    setCheckingRuntime(true);
    try {
      const ok = await probeRuntimeHealth();
      if (mountedRef.current) {
        setRuntimeOnline(ok);
        setTransientStatus(ok ? "Runtime reachable. Try Connect again." : "");
      }
    } finally {
      if (mountedRef.current) {
        setCheckingRuntime(false);
      }
    }
  }, [checkingRuntime]);

  const handleNativeSubmit = useCallback(() => {
    if (mountedRef.current) {
      setTransientStatus("Handing off to secure local login...");
    }
  }, []);

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
              backgroundImage: "url(/theme/sadie-portrait.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "50% 12%",
              transform: "scale(1.02)",
              filter: "saturate(1.04) contrast(1.06) brightness(0.94)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(140deg, rgba(8,4,6,0.04) 0%, rgba(8,4,6,0.46) 42%, rgba(8,4,6,0.90) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 20%, rgba(255,214,217,0.18), transparent 16%), radial-gradient(circle at 56% 38%, rgba(232,160,170,0.10), transparent 20%), radial-gradient(circle at 64% 72%, rgba(212,149,106,0.13), transparent 28%)",
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
                  "/theme/sadie-cover.jpg",
                  "/theme/sadie-armani.jpg",
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
                        objectPosition:
                          src === "/theme/sadie-armani.jpg"
                            ? "50% 18%"
                            : src === "/theme/sadie-portrait.jpg"
                              ? "50% 16%"
                              : "50% 24%",
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
                  textShadow: "0 10px 36px rgba(0,0,0,.28)",
                }}
              >
                Nexus Prime
                <br />
                in a lower light.
              </div>
              <div
                style={{
                  color: "rgba(255,226,228,0.74)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "420px",
                }}
              >
                Closer framing, warmer contrast, and a more glamorous, intimate
                editorial entrance built around the Sadie image set already in
                the repo.
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
              Token validation stays local to this server. This flow uses a
              direct secure form submit so the real auth path reaches the
              server without extra client-side ceremony.
            </div>
          </div>

          <form
            action="/auth/connect"
            method="POST"
            onSubmit={handleNativeSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <input type="hidden" name="next" value={destination} />

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
                name="token"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your NEXUS_TOKEN…"
                autoFocus
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
                      border: "1px solid rgba(196,72,90,0.34)",
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
              type="submit"
              style={{
                height: "50px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #c4485a 0%, #d4956a 100%)",
                border: "none",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all var(--t)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 12px 30px rgba(196,72,90,.28)",
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
                Connect
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
              { label: "state", value: "native submit" },
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
