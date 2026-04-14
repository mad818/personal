export const CLIENT_SENSITIVE_SETTINGS_KEYS = [
  "apiKey",
  "minimaxKey",
  "localApiKey",
  "cgKey",
  "finnhubKey",
  "nvdKey",
  "guardianKey",
  "fredKey",
  "otxKey",
  "aisstreamKey",
  "firmsKey",
  "firecrawlKey",
  "braveKey",
  "hibpKey",
  "vtKey",
  "shodanKey",
] as const;

export type ClientSensitiveSettingsKey =
  (typeof CLIENT_SENSITIVE_SETTINGS_KEYS)[number];

export function sanitizeClientSettingsForPersistence<
  T extends Record<string, unknown>,
>(settings: T): T {
  const next: Record<string, unknown> = { ...settings };
  for (const key of CLIENT_SENSITIVE_SETTINGS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      next[key] = "";
    }
  }
  return next as T;
}
