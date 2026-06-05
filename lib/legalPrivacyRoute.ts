export type LegalPrivacyRouteKind =
  | "none"
  | "vpn"
  | "tailscale-exit-node"
  | "legal-proxy";

export interface LegalPrivacyRouteOption {
  kind: LegalPrivacyRouteKind;
  label: string;
  shortLabel: string;
  description: string;
}

export interface LegalPrivacyRoutePosture {
  routeKind: LegalPrivacyRouteKind;
  label: string;
  active: boolean;
  confirmed: boolean;
  canOpenPublicLinks: boolean;
  statusLabel: string;
  summary: string;
  confirmationLabel: string;
}

export const LEGAL_PRIVACY_ROUTE_OPTIONS: LegalPrivacyRouteOption[] = [
  {
    kind: "none",
    label: "No privacy route",
    shortLabel: "None",
    description: "Public links stay locked until a legal route is active.",
  },
  {
    kind: "vpn",
    label: "VPN",
    shortLabel: "VPN",
    description:
      "Use an OS-level VPN profile that you are allowed to use for this session.",
  },
  {
    kind: "tailscale-exit-node",
    label: "Tailscale exit node",
    shortLabel: "Exit node",
    description:
      "Use a Tailscale exit node you control or are authorized to route through.",
  },
  {
    kind: "legal-proxy",
    label: "Legal proxy",
    shortLabel: "Proxy",
    description:
      "Use a lawful proxy service or self-managed proxy with permission.",
  },
];

const ROUTE_OPTIONS_BY_KIND = new Map(
  LEGAL_PRIVACY_ROUTE_OPTIONS.map((option) => [option.kind, option]),
);

export function buildLegalPrivacyRoutePosture(
  routeKind: LegalPrivacyRouteKind,
  confirmed: boolean,
): LegalPrivacyRoutePosture {
  const option =
    ROUTE_OPTIONS_BY_KIND.get(routeKind) ?? ROUTE_OPTIONS_BY_KIND.get("none")!;
  const active = option.kind !== "none";
  const canOpenPublicLinks = active && confirmed;

  return {
    routeKind: option.kind,
    label: option.label,
    active,
    confirmed,
    canOpenPublicLinks,
    statusLabel: canOpenPublicLinks
      ? "Public links unlocked"
      : active
        ? "Confirm route to unlock"
        : "Public links locked",
    summary: canOpenPublicLinks
      ? `${option.label} confirmed for this session. Public links can open with no-referrer browser launch controls.`
      : active
        ? `${option.label} selected. Confirm it is active before opening public links.`
        : "Nexus does not hide your IP by itself. Select and confirm a legal VPN, Tailscale exit node, or legal proxy before opening public links.",
    confirmationLabel:
      option.kind === "none"
        ? "Select a legal privacy route before confirming."
        : `I confirm ${option.label} is active and authorized for this session.`,
  };
}
