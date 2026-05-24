import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { NetworkMode } from "@/lib/security/routePolicy";

export const PHONE_ACCEPTANCE_RECEIPT_VERSION = 1;
export const PHONE_ACCEPTANCE_RECEIPT_FILE =
  "data/phone-acceptance-receipts.json";

const MAX_RECEIPTS = 50;
const DEFAULT_RECEIPT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRIVATE_LAN_IP_RE =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;

export type PhoneAcceptanceDeviceClass =
  | "phone"
  | "tablet"
  | "desktop"
  | "unknown";

export type PhoneAcceptanceDisplayMode = "standalone" | "browser" | "unknown";

export type PhoneAcceptanceReceiptInput = {
  route?: unknown;
  source?: unknown;
  browserStorageReady?: unknown;
  pwaDisplayMode?: unknown;
  pwaCapable?: unknown;
  localFastPathReceipt?: unknown;
  localAiReceipt?: unknown;
};

export type PhoneAcceptanceReceiptContext = {
  userAgent?: string | null;
  sessionAuthenticated: boolean;
  tokenConfigured: boolean;
  networkMode: NetworkMode;
};

export type PhoneAcceptanceReceipt = {
  version: typeof PHONE_ACCEPTANCE_RECEIPT_VERSION;
  id: string;
  capturedAt: string;
  route: string;
  source: string;
  deviceClass: PhoneAcceptanceDeviceClass;
  browserStorageReady: boolean;
  pwaDisplayMode: PhoneAcceptanceDisplayMode;
  pwaCapable: boolean;
  sessionAuthenticated: boolean;
  tokenConfigured: boolean;
  networkMode: NetworkMode;
  localFastPathReceipt: boolean;
  localAiReceipt: boolean;
};

export type PhoneAcceptanceReceiptSummary = {
  windowHours: number;
  count: number;
  mobileCount: number;
  latestAt: string | null;
  phoneOpened: boolean;
  mobileDeviceOpened: boolean;
  mobileAuthenticated: boolean;
  browserStorageReady: boolean;
  pwaCapable: boolean;
  pwaInstalled: boolean;
  localFastPathReceipt: boolean;
  localAiReceipt: boolean;
  recent: PhoneAcceptanceReceipt[];
};

type ReceiptFileShape = {
  version: typeof PHONE_ACCEPTANCE_RECEIPT_VERSION;
  receipts: PhoneAcceptanceReceipt[];
};

function receiptFilePath() {
  return path.resolve(
    process.cwd(),
    process.env.NEXUS_PHONE_ACCEPTANCE_RECEIPTS_FILE ??
      PHONE_ACCEPTANCE_RECEIPT_FILE,
  );
}

function sanitizeString(value: string, fallback: string, maxLength: number) {
  const cleaned = value
    .replace(PRIVATE_LAN_IP_RE, "<LAN-IP>")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  return (cleaned || fallback).slice(0, maxLength);
}

function sanitizeRoute(value: unknown) {
  if (typeof value !== "string" || !value.trim().startsWith("/")) {
    return "/";
  }

  try {
    const url = new URL(value.trim(), "http://nexus.local");
    for (const key of Array.from(url.searchParams.keys())) {
      if (/token|secret|password|auth|cookie|session/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return sanitizeString(`${url.pathname}${url.search}`, "/", 180);
  } catch {
    return "/";
  }
}

function sanitizeSource(value: unknown) {
  if (typeof value !== "string") return "unknown";
  return sanitizeString(value, "unknown", 64).replace(/[^a-z0-9._:-]/gi, "-");
}

function booleanValue(value: unknown) {
  return value === true;
}

function normalizeDisplayMode(value: unknown): PhoneAcceptanceDisplayMode {
  if (value === "standalone" || value === "browser") return value;
  return "unknown";
}

function isMobileDeviceClass(deviceClass: PhoneAcceptanceDeviceClass) {
  return deviceClass === "phone" || deviceClass === "tablet";
}

function parseReceiptTime(receipt: PhoneAcceptanceReceipt) {
  const time = Date.parse(receipt.capturedAt);
  return Number.isFinite(time) ? time : 0;
}

function receiptIsRecent(
  receipt: PhoneAcceptanceReceipt,
  nowMs: number,
  windowMs: number,
) {
  const capturedMs = parseReceiptTime(receipt);
  return capturedMs > 0 && nowMs - capturedMs <= windowMs;
}

function normalizeReceipt(value: unknown): PhoneAcceptanceReceipt | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PhoneAcceptanceReceipt>;
  if (record.version !== PHONE_ACCEPTANCE_RECEIPT_VERSION) return null;
  if (typeof record.id !== "string" || typeof record.capturedAt !== "string") {
    return null;
  }
  const deviceClass =
    record.deviceClass === "phone" ||
    record.deviceClass === "tablet" ||
    record.deviceClass === "desktop" ||
    record.deviceClass === "unknown"
      ? record.deviceClass
      : "unknown";
  const networkMode =
    record.networkMode === "isolated" ||
    record.networkMode === "internal" ||
    record.networkMode === "connected"
      ? record.networkMode
      : "isolated";

  return {
    version: PHONE_ACCEPTANCE_RECEIPT_VERSION,
    id: sanitizeString(record.id, "receipt", 80),
    capturedAt: record.capturedAt,
    route: sanitizeRoute(record.route),
    source: sanitizeSource(record.source),
    deviceClass,
    browserStorageReady: record.browserStorageReady === true,
    pwaDisplayMode: normalizeDisplayMode(record.pwaDisplayMode),
    pwaCapable: record.pwaCapable === true,
    sessionAuthenticated: record.sessionAuthenticated === true,
    tokenConfigured: record.tokenConfigured === true,
    networkMode,
    localFastPathReceipt: record.localFastPathReceipt === true,
    localAiReceipt: record.localAiReceipt === true,
  };
}

export function classifyPhoneAcceptanceDevice(
  userAgent: string | null | undefined,
): PhoneAcceptanceDeviceClass {
  const normalized = (userAgent ?? "").toLowerCase();
  if (!normalized) return "unknown";
  if (/ipad|tablet/.test(normalized)) return "tablet";
  if (/macintosh/.test(normalized) && /mobile/.test(normalized)) return "tablet";
  if (/iphone|ipod|windows phone/.test(normalized)) return "phone";
  if (/android/.test(normalized)) {
    return /mobile/.test(normalized) ? "phone" : "tablet";
  }
  if (/mobile/.test(normalized)) return "phone";
  if (/windows|macintosh|linux|cros/.test(normalized)) return "desktop";
  return "unknown";
}

export async function readPhoneAcceptanceReceipts() {
  const filePath = receiptFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ReceiptFileShape> | unknown[];
    const receipts = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.receipts)
        ? parsed.receipts
        : [];
    return receipts
      .map(normalizeReceipt)
      .filter((receipt): receipt is PhoneAcceptanceReceipt => Boolean(receipt));
  } catch {
    return [];
  }
}

async function writePhoneAcceptanceReceipts(receipts: PhoneAcceptanceReceipt[]) {
  const filePath = receiptFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload: ReceiptFileShape = {
    version: PHONE_ACCEPTANCE_RECEIPT_VERSION,
    receipts,
  };
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function appendPhoneAcceptanceReceipt(
  input: PhoneAcceptanceReceiptInput,
  context: PhoneAcceptanceReceiptContext,
) {
  const capturedAt = new Date();
  const receipt: PhoneAcceptanceReceipt = {
    version: PHONE_ACCEPTANCE_RECEIPT_VERSION,
    id: `phone-acceptance-${capturedAt.toISOString().replace(/[:.]/g, "-")}-${
      randomUUID().slice(0, 8)
    }`,
    capturedAt: capturedAt.toISOString(),
    route: sanitizeRoute(input.route),
    source: sanitizeSource(input.source),
    deviceClass: classifyPhoneAcceptanceDevice(context.userAgent),
    browserStorageReady: booleanValue(input.browserStorageReady),
    pwaDisplayMode: normalizeDisplayMode(input.pwaDisplayMode),
    pwaCapable: booleanValue(input.pwaCapable),
    sessionAuthenticated: context.sessionAuthenticated,
    tokenConfigured: context.tokenConfigured,
    networkMode: context.networkMode,
    localFastPathReceipt: booleanValue(input.localFastPathReceipt),
    localAiReceipt: booleanValue(input.localAiReceipt),
  };

  const receipts = await readPhoneAcceptanceReceipts();
  const nextReceipts = [...receipts, receipt]
    .sort((a, b) => parseReceiptTime(a) - parseReceiptTime(b))
    .slice(-MAX_RECEIPTS);
  await writePhoneAcceptanceReceipts(nextReceipts);
  return receipt;
}

export function summarizePhoneAcceptanceReceipts(
  receipts: PhoneAcceptanceReceipt[],
  nowMs = Date.now(),
  windowMs = DEFAULT_RECEIPT_WINDOW_MS,
): PhoneAcceptanceReceiptSummary {
  const recent = receipts
    .filter((receipt) => receiptIsRecent(receipt, nowMs, windowMs))
    .sort((a, b) => parseReceiptTime(b) - parseReceiptTime(a));
  const mobileReceipts = recent.filter((receipt) =>
    isMobileDeviceClass(receipt.deviceClass),
  );
  const receiptWindowHours = Math.round(windowMs / (60 * 60 * 1000));

  return {
    windowHours: receiptWindowHours,
    count: recent.length,
    mobileCount: mobileReceipts.length,
    latestAt: recent[0]?.capturedAt ?? null,
    phoneOpened: mobileReceipts.length > 0,
    mobileDeviceOpened: mobileReceipts.length > 0,
    mobileAuthenticated: mobileReceipts.some(
      (receipt) => receipt.sessionAuthenticated || !receipt.tokenConfigured,
    ),
    browserStorageReady: mobileReceipts.some(
      (receipt) => receipt.browserStorageReady,
    ),
    pwaCapable: mobileReceipts.some((receipt) => receipt.pwaCapable),
    pwaInstalled: mobileReceipts.some(
      (receipt) => receipt.pwaDisplayMode === "standalone",
    ),
    localFastPathReceipt: mobileReceipts.some(
      (receipt) => receipt.localFastPathReceipt,
    ),
    localAiReceipt: mobileReceipts.some((receipt) => receipt.localAiReceipt),
    recent: recent.slice(0, 8),
  };
}
