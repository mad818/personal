export type ClientJsonResourceResult<T> =
  | { ok: true; payload: T }
  | { ok: false };

export async function loadClientJsonResource<T>(
  request: () => Promise<Response>,
  isPayload: (value: unknown) => value is T,
): Promise<ClientJsonResourceResult<T>> {
  try {
    const response = await request();
    if (!response.ok) return { ok: false };

    const payload: unknown = await response.json();
    return isPayload(payload) ? { ok: true, payload } : { ok: false };
  } catch {
    return { ok: false };
  }
}
