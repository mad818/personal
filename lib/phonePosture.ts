/** Narrow / touch / PWA posture for phone LAN and mobile browsers. */

export const PHONE_POSTURE_MAX_WIDTH_PX = 767;

export function detectPhonePosture(
  width: number,
  options: {
    standalone?: boolean;
    coarsePointer?: boolean;
  } = {},
): boolean {
  if (width <= PHONE_POSTURE_MAX_WIDTH_PX) return true;
  if (options.standalone && width <= 900) return true;
  if (options.coarsePointer && width <= 820) return true;
  return false;
}

export function readPhonePostureFromWindow(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches === true;
  return detectPhonePosture(window.innerWidth, { standalone, coarsePointer });
}
