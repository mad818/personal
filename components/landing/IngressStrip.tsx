import Link from "next/link";

export interface IngressStripProps {
  authEnabled: boolean;
  authError?: "invalid" | "server" | null;
  ctaHref: string;
  ctaLabel?: string;
  isAuthenticated: boolean;
}

const AUTH_ERROR_COPY: Record<"invalid" | "server", string> = {
  invalid: "Invalid token. Check your .env.local NEXUS_TOKEN.",
  server: "Token validation is not configured on the server.",
};

export default function IngressStrip({
  authEnabled,
  authError = null,
  ctaHref,
  ctaLabel = "Enter Homefront",
  isAuthenticated,
}: IngressStripProps) {
  const shouldCollectToken = authEnabled && !isAuthenticated;
  const status = authError
    ? AUTH_ERROR_COPY[authError]
    : "Use your local server token to open HQ.";

  return (
    <section
      id="nexus-landing-ingress"
      className="nexus-landing-ingress nexus-landing-enter"
      aria-label="Landing ingress"
      data-testid="landing-ingress"
    >
      <div className="nexus-landing-ingress__inner">
        <p className="nexus-landing-ingress__meta">v0.1 · Internal beta</p>
        {shouldCollectToken ? (
          <form
            action="/auth/connect"
            className="nexus-landing-ingress__auth"
            data-testid="landing-auth-form"
            method="POST"
          >
            <input type="hidden" name="next" value="/hq" />
            <input
              type="hidden"
              name="failureNext"
              value="/#nexus-landing-ingress"
            />
            <label
              className="nexus-landing-ingress__label"
              htmlFor="nexus-landing-access-token"
            >
              Access token
            </label>
            <div className="nexus-landing-ingress__authRow">
              <input
                id="nexus-landing-access-token"
                className="nexus-landing-ingress__input"
                data-testid="landing-auth-token-input"
                name="token"
                placeholder="Paste NEXUS_TOKEN"
                required
                type="password"
              />
              <button
                className="nexus-landing-ingress__cta"
                data-testid="landing-auth-submit"
                type="submit"
              >
                Unlock HQ
              </button>
            </div>
            <p
              className={
                authError
                  ? "nexus-landing-ingress__status nexus-landing-ingress__status--error"
                  : "nexus-landing-ingress__status"
              }
              data-testid="landing-auth-status"
            >
              {status}
            </p>
          </form>
        ) : (
          <Link
            href={ctaHref}
            className="nexus-landing-ingress__cta"
            data-testid="landing-ingress-cta"
          >
            {ctaLabel} →
          </Link>
        )}
        <p className="nexus-landing-ingress__trust">
          Local-first / BYOK / No telemetry
        </p>
      </div>
    </section>
  );
}
