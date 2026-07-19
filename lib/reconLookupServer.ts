import { isIP } from "node:net";
import {
  RECON_LOOKUP_OPERATIONS,
  type ReconLookupFailure,
  type ReconLookupOperation,
  type ReconLookupRequest,
  type ReconLookupResponse,
  type ReconLookupServerErrorCode,
  type VirusTotalTargetType,
} from "./reconLookupTypes.ts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface ReconLookupServerOptions {
  fetchImpl?: FetchLike;
  env?: Readonly<Record<string, string | undefined>>;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface ReconLookupExecution {
  status: number;
  body: ReconLookupResponse;
}

type ParsedRequest = { ok: true; request: ReconLookupRequest } | { ok: false };

class LookupFailure extends Error {
  readonly code: ReconLookupServerErrorCode;
  readonly status: number;

  constructor(code: ReconLookupServerErrorCode, status: number) {
    super(code);
    this.name = "LookupFailure";
    this.code = code;
    this.status = status;
  }
}

const OPERATION_SET = new Set<string>(RECON_LOOKUP_OPERATIONS);
const VIRUS_TOTAL_TARGET_TYPES = new Set<VirusTotalTargetType>([
  "domain",
  "ip",
  "hash",
  "url",
]);
const DNS_RECORD_TYPES = ["A", "MX", "NS", "TXT"] as const;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;
const SAFE_ERRORS: Record<ReconLookupServerErrorCode, string> = {
  invalid_request: "Invalid RECON lookup request.",
  key_required: "This lookup requires a configured server-side key.",
  rate_limited: "The lookup provider rate limit was reached.",
  upstream_unavailable: "The lookup provider is temporarily unavailable.",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (domain.length < 3 || domain.length > 253 || !domain.includes(".")) {
    return null;
  }
  const labels = domain.split(".");
  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9-]+$/.test(label) ||
        label.startsWith("-") ||
        label.endsWith("-"),
    )
  ) {
    return null;
  }
  return domain;
}

function normalizeEmail(value: string) {
  const email = value.trim();
  if (email.length > 254 || /\s/.test(email)) return null;
  const split = email.lastIndexOf("@");
  if (split < 1 || split > 64) return null;
  const domain = normalizeDomain(email.slice(split + 1));
  return domain ? `${email.slice(0, split)}@${domain}` : null;
}

function normalizeUrl(value: string) {
  if (value.length > 320) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    if (!normalizeDomain(parsed.hostname) && isIP(parsed.hostname) === 0)
      return null;
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeTarget(
  operation: ReconLookupOperation,
  targetValue: string,
  targetType?: VirusTotalTargetType,
) {
  const target = targetValue.trim();
  if (!target || target.length > 320) return null;

  if (
    operation === "rdap_domain" ||
    operation === "dns_records" ||
    operation === "certificates" ||
    operation === "domain_geo" ||
    operation === "subdomains" ||
    operation === "dns_security"
  ) {
    return normalizeDomain(target);
  }
  if (
    operation === "rdap_ip" ||
    operation === "ip_geo" ||
    operation === "shodan" ||
    operation === "reverse_ip"
  ) {
    return isIP(target) > 0 ? target : null;
  }
  if (operation === "email_reputation" || operation === "hibp") {
    return normalizeEmail(target);
  }
  if (operation === "username") {
    return /^[a-z0-9_.-]{1,64}$/i.test(target) ? target : null;
  }
  if (operation === "passive_dns") {
    return isIP(target) > 0 ? target : normalizeDomain(target);
  }
  if (operation === "virustotal") {
    if (targetType === "domain") return normalizeDomain(target);
    if (targetType === "ip") return isIP(target) > 0 ? target : null;
    if (targetType === "hash")
      return /^[a-f0-9]{32,64}$/i.test(target) ? target : null;
    if (targetType === "url") return normalizeUrl(target);
  }
  return null;
}

export function parseReconLookupRequest(input: unknown): ParsedRequest {
  if (!isPlainObject(input)) return { ok: false };
  const keys = Object.keys(input);
  if (
    keys.some((key) => !["operation", "target", "targetType"].includes(key))
  ) {
    return { ok: false };
  }
  if (
    typeof input.operation !== "string" ||
    !OPERATION_SET.has(input.operation) ||
    typeof input.target !== "string"
  ) {
    return { ok: false };
  }

  const operation = input.operation as ReconLookupOperation;
  const targetType =
    typeof input.targetType === "string" &&
    VIRUS_TOTAL_TARGET_TYPES.has(input.targetType as VirusTotalTargetType)
      ? (input.targetType as VirusTotalTargetType)
      : undefined;
  if (
    (operation === "virustotal" && !targetType) ||
    (operation !== "virustotal" && input.targetType !== undefined)
  ) {
    return { ok: false };
  }
  const target = normalizeTarget(operation, input.target, targetType);
  if (!target) return { ok: false };

  return {
    ok: true,
    request: targetType
      ? { operation, target, targetType }
      : { operation, target },
  };
}

function failure(
  code: ReconLookupServerErrorCode,
  status: number,
): ReconLookupExecution {
  const body: ReconLookupFailure = {
    ok: false,
    code,
    error: SAFE_ERRORS[code],
  };
  return { status, body };
}

async function readBoundedText(response: Response, maxBytes: number) {
  const declared = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new LookupFailure("upstream_unavailable", 502);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new LookupFailure("upstream_unavailable", 502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

async function fetchResponse(
  url: string | URL,
  init: RequestInit,
  options: Required<Pick<ReconLookupServerOptions, "fetchImpl" | "timeoutMs">>,
) {
  try {
    return await options.fetchImpl(url, {
      ...init,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    if (error instanceof LookupFailure) throw error;
    throw new LookupFailure("upstream_unavailable", 502);
  }
}

function assertProviderStatus(response: Response) {
  if (response.status === 429) throw new LookupFailure("rate_limited", 429);
  if (!response.ok) throw new LookupFailure("upstream_unavailable", 502);
}

async function fetchText(
  url: string | URL,
  init: RequestInit,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const response = await fetchResponse(url, init, options);
  assertProviderStatus(response);
  return readBoundedText(response, options.maxResponseBytes);
}

async function fetchJson(
  url: string | URL,
  init: RequestInit,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const text = await fetchText(url, init, options);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LookupFailure("upstream_unavailable", 502);
  }
}

async function fetchJsonObject(
  url: string | URL,
  init: RequestInit,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const value = await fetchJson(url, init, options);
  if (!isPlainObject(value)) {
    throw new LookupFailure("upstream_unavailable", 502);
  }
  return value;
}

async function fetchJsonArray(
  url: string | URL,
  init: RequestInit,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const value = await fetchJson(url, init, options);
  if (!Array.isArray(value)) {
    throw new LookupFailure("upstream_unavailable", 502);
  }
  return value;
}

async function fetchOptionalJson(
  url: string | URL,
  init: RequestInit,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const response = await fetchResponse(url, init, options);
  if (response.status === 404) return null;
  assertProviderStatus(response);
  const text = await readBoundedText(response, options.maxResponseBytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LookupFailure("upstream_unavailable", 502);
  }
}

async function fetchOptionalJsonObject(
  url: string | URL,
  init: RequestInit,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const value = await fetchOptionalJson(url, init, options);
  if (value === null) return null;
  if (!isPlainObject(value)) {
    throw new LookupFailure("upstream_unavailable", 502);
  }
  return value;
}

async function dnsLookup(
  name: string,
  type: (typeof DNS_RECORD_TYPES)[number],
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
) {
  const url = new URL("https://dns.google/resolve");
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);
  return fetchJsonObject(
    url,
    { headers: { Accept: "application/json" } },
    options,
  );
}

async function settledRecord<T extends readonly string[]>(
  keys: T,
  lookups: Promise<unknown>[],
) {
  const settled = await Promise.allSettled(lookups);
  if (settled.every((item) => item.status === "rejected")) {
    const rateLimited = settled.some(
      (item) =>
        item.status === "rejected" &&
        item.reason instanceof LookupFailure &&
        item.reason.code === "rate_limited",
    );
    throw new LookupFailure(
      rateLimited ? "rate_limited" : "upstream_unavailable",
      rateLimited ? 429 : 502,
    );
  }
  return Object.fromEntries(
    keys.map((key, index) => [
      key,
      settled[index]?.status === "fulfilled" ? settled[index].value : null,
    ]),
  );
}

async function executeOperation(
  request: ReconLookupRequest,
  options: Required<
    Pick<
      ReconLookupServerOptions,
      "fetchImpl" | "timeoutMs" | "maxResponseBytes"
    >
  >,
  env: Readonly<Record<string, string | undefined>>,
) {
  const encoded = encodeURIComponent(request.target);
  switch (request.operation) {
    case "rdap_domain":
      return fetchJsonObject(`https://rdap.org/domain/${encoded}`, {}, options);
    case "rdap_ip":
      return fetchJsonObject(`https://rdap.org/ip/${encoded}`, {}, options);
    case "dns_records":
      return settledRecord(
        DNS_RECORD_TYPES,
        DNS_RECORD_TYPES.map((type) =>
          dnsLookup(request.target, type, options),
        ),
      );
    case "certificates": {
      const url = new URL("https://crt.sh/");
      url.searchParams.set("q", request.target);
      url.searchParams.set("output", "json");
      return fetchJsonArray(url, {}, options);
    }
    case "ip_geo":
      return fetchJsonObject(`https://ipapi.co/${encoded}/json/`, {}, options);
    case "domain_geo": {
      const dns = (await dnsLookup(request.target, "A", options)) as {
        Answer?: { data?: unknown }[];
      };
      const ip =
        typeof dns.Answer?.[0]?.data === "string" ? dns.Answer[0].data : null;
      if (!ip || isIP(ip) === 0) return { ip: null, geo: null };
      const geo = await fetchJsonObject(
        `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
        {},
        options,
      );
      return { ip, geo };
    }
    case "subdomains": {
      const url = new URL("https://api.hackertarget.com/hostsearch/");
      url.searchParams.set("q", request.target);
      return fetchText(url, {}, options);
    }
    case "dns_security":
      return settledRecord(["spf", "dmarc", "dkim"] as const, [
        dnsLookup(request.target, "TXT", options),
        dnsLookup(`_dmarc.${request.target}`, "TXT", options),
        dnsLookup(`default._domainkey.${request.target}`, "TXT", options),
      ]);
    case "email_reputation":
      return fetchJsonObject(
        `https://emailrep.io/${encoded}`,
        {
          headers: { "User-Agent": "Nexus-Prime", Accept: "application/json" },
        },
        options,
      );
    case "username": {
      const settled = await Promise.allSettled([
        fetchOptionalJsonObject(
          `https://api.github.com/users/${encoded}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "Nexus-Prime",
            },
          },
          options,
        ),
        fetchOptionalJsonObject(
          `https://www.gravatar.com/${encoded}.json`,
          {},
          options,
        ),
      ]);
      if (settled.every((item) => item.status === "rejected")) {
        throw new LookupFailure("upstream_unavailable", 502);
      }
      return {
        github: settled[0]?.status === "fulfilled" ? settled[0].value : null,
        gravatar: settled[1]?.status === "fulfilled" ? settled[1].value : null,
        partial: settled.some((item) => item.status === "rejected"),
      };
    }
    case "hibp": {
      const key = env.HIBP_API_KEY?.trim();
      if (!key) throw new LookupFailure("key_required", 428);
      const url = new URL(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${encoded}`,
      );
      url.searchParams.set("truncateResponse", "false");
      const response = await fetchResponse(
        url,
        { headers: { "hibp-api-key": key, "User-Agent": "Nexus-Prime" } },
        options,
      );
      if (response.status === 404) return [];
      assertProviderStatus(response);
      const text = await readBoundedText(response, options.maxResponseBytes);
      try {
        const value = JSON.parse(text) as unknown;
        if (!Array.isArray(value)) {
          throw new LookupFailure("upstream_unavailable", 502);
        }
        return value;
      } catch {
        throw new LookupFailure("upstream_unavailable", 502);
      }
    }
    case "virustotal": {
      const key = env.VT_API_KEY?.trim();
      if (!key) throw new LookupFailure("key_required", 428);
      let resource: string;
      if (request.targetType === "hash") resource = `files/${encoded}`;
      else if (request.targetType === "ip")
        resource = `ip_addresses/${encoded}`;
      else {
        const domain =
          request.targetType === "url"
            ? new URL(request.target).hostname
            : request.target;
        resource = `domains/${encodeURIComponent(domain)}`;
      }
      return fetchJsonObject(
        `https://www.virustotal.com/api/v3/${resource}`,
        { headers: { "x-apikey": key } },
        options,
      );
    }
    case "shodan": {
      const key = env.SHODAN_API_KEY?.trim();
      if (!key) throw new LookupFailure("key_required", 428);
      const url = new URL(`https://api.shodan.io/shodan/host/${encoded}`);
      url.searchParams.set("key", key);
      return fetchJsonObject(url, {}, options);
    }
    case "passive_dns":
      return fetchText(
        `https://www.circl.lu/pdns/query/${encoded}`,
        { headers: { Accept: "application/json" } },
        options,
      );
    case "reverse_ip": {
      const url = new URL("https://api.hackertarget.com/reverseiplookup/");
      url.searchParams.set("q", request.target);
      return fetchText(url, {}, options);
    }
  }
}

export async function executeReconLookup(
  input: unknown,
  serverOptions: ReconLookupServerOptions = {},
): Promise<ReconLookupExecution> {
  const parsed = parseReconLookupRequest(input);
  if (!parsed.ok) return failure("invalid_request", 400);

  const options = {
    fetchImpl: serverOptions.fetchImpl ?? fetch,
    timeoutMs: serverOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes:
      serverOptions.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
  };
  const env = serverOptions.env ?? process.env;

  try {
    const data = await executeOperation(parsed.request, options, env);
    return { status: 200, body: { ok: true, data } };
  } catch (error) {
    if (error instanceof LookupFailure)
      return failure(error.code, error.status);
    return failure("upstream_unavailable", 502);
  }
}
