export type SettingsServerLoadState = "idle" | "loading" | "ready" | "error";

export const SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE =
  "Server settings status is unavailable. Check the local Nexus runtime and retry.";

export type SettingsServerSnapshot = {
  status: Record<string, boolean>;
  config?: Record<string, unknown>;
  release?: unknown;
};

export type SettingsServerLoadResult =
  | { ok: true; snapshot: SettingsServerSnapshot }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

export async function loadSettingsServerSnapshot(
  request: () => Promise<Response>,
): Promise<SettingsServerLoadResult> {
  try {
    const response = await request();
    if (!response.ok) {
      return {
        ok: false,
        message: SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE,
      };
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isBooleanRecord(payload.status)) {
      return {
        ok: false,
        message: SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      ok: true,
      snapshot: {
        status: payload.status,
        config: isRecord(payload.config) ? payload.config : undefined,
        release: payload.release,
      },
    };
  } catch {
    return {
      ok: false,
      message: SETTINGS_SERVER_STATUS_UNAVAILABLE_MESSAGE,
    };
  }
}
