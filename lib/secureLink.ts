export type SecureLinkRisk = "empty" | "safe" | "private" | "blocked";

export type SecureLinkNetworkScope =
  | "unknown"
  | "same-app"
  | "private"
  | "public"
  | "blocked";

export interface SecureLinkInspection {
  risk: SecureLinkRisk;
  networkScope: SecureLinkNetworkScope;
  requiresIpPrivacy: boolean;
  canOpen: boolean;
  label: string;
  reason: string;
  href?: string;
  displayHost?: string;
}

const MAX_LINK_LENGTH = 2048;
const HOST_PORT_WITHOUT_SCHEME = /^[a-z0-9.-]+:\d{2,5}(?:[/?#].*)?$/i;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

function blocked(reason: string): SecureLinkInspection {
  return {
    risk: "blocked",
    networkScope: "blocked",
    requiresIpPrivacy: false,
    canOpen: false,
    label: "Blocked",
    reason,
  };
}

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254)
  );
}

function isPrivateHost(hostname: string) {
  const host = normalizeHost(hostname);
  return (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".ts.net") ||
    isPrivateIpv4(host)
  );
}

function normalizeInput(input: string) {
  const trimmed = input.trim();
  if (HOST_PORT_WITHOUT_SCHEME.test(trimmed)) return `http://${trimmed}`;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (!SCHEME_PATTERN.test(trimmed) && !trimmed.startsWith("/")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function inspectSecureLink(input: string): SecureLinkInspection {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      risk: "empty",
      networkScope: "unknown",
      requiresIpPrivacy: false,
      canOpen: false,
      label: "Waiting",
      reason: "Paste a link to validate it before opening.",
    };
  }
  if (trimmed.length > MAX_LINK_LENGTH) {
    return blocked("The link is too long to open safely here.");
  }
  if (/\s/.test(trimmed)) {
    return blocked("Remove spaces or encode them before opening this link.");
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return {
      risk: "safe",
      networkScope: "same-app",
      requiresIpPrivacy: false,
      canOpen: true,
      label: "Same app",
      reason: "This opens inside the current Nexus host without a referrer.",
      href: trimmed,
      displayHost: "Nexus",
    };
  }

  try {
    const url = new URL(normalizeInput(trimmed));
    const protocol = url.protocol.toLowerCase();
    if (url.username || url.password) {
      return blocked("Links with embedded usernames or passwords are blocked.");
    }
    if (protocol === "https:") {
      const privateHost = isPrivateHost(url.hostname);
      return {
        risk: privateHost ? "private" : "safe",
        networkScope: privateHost ? "private" : "public",
        requiresIpPrivacy: !privateHost,
        canOpen: true,
        label: privateHost ? "Private HTTPS" : "Public HTTPS",
        reason: privateHost
          ? "Private host. This stays on localhost, LAN, or Tailscale-style access."
          : "Public site. The destination can see your network IP unless a VPN, Tailscale exit node, or privacy route is active.",
        href: url.toString(),
        displayHost: url.hostname,
      };
    }
    if (protocol === "http:") {
      if (!isPrivateHost(url.hostname)) {
        return blocked("Public plain-HTTP links are blocked. Use HTTPS.");
      }
      return {
        risk: "private",
        networkScope: "private",
        requiresIpPrivacy: false,
        canOpen: true,
        label: "Private HTTP",
        reason:
          "Allowed for localhost, LAN, or Tailscale-style private hosts only.",
        href: url.toString(),
        displayHost: url.hostname,
      };
    }
    return blocked(`The ${protocol.replace(":", "")} protocol is not allowed.`);
  } catch {
    return blocked("This does not look like a valid link.");
  }
}
