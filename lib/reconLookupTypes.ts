export const RECON_LOOKUP_OPERATIONS = [
  "rdap_domain",
  "rdap_ip",
  "dns_records",
  "certificates",
  "ip_geo",
  "domain_geo",
  "subdomains",
  "dns_security",
  "email_reputation",
  "username",
  "hibp",
  "virustotal",
  "shodan",
  "passive_dns",
  "reverse_ip",
] as const;

export type ReconLookupOperation = (typeof RECON_LOOKUP_OPERATIONS)[number];
export type VirusTotalTargetType = "domain" | "ip" | "hash" | "url";

export interface ReconLookupRequest {
  operation: ReconLookupOperation;
  target: string;
  targetType?: VirusTotalTargetType;
}

export type ReconLookupServerErrorCode =
  | "invalid_request"
  | "key_required"
  | "rate_limited"
  | "upstream_unavailable";

export interface ReconLookupSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ReconLookupFailure {
  ok: false;
  code: ReconLookupServerErrorCode;
  error: string;
}

export type ReconLookupResponse<T = unknown> =
  | ReconLookupSuccess<T>
  | ReconLookupFailure;
