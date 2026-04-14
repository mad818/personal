export type MissionIntent = "observe" | "investigate" | "archive" | "launch";
export type MissionOrigin = "hq";

export interface MissionHandoffState {
  mission: MissionIntent;
  from: MissionOrigin;
  source: string | null;
}

export interface MissionContinuationTarget {
  href: string;
  label: string;
  tab: string;
}

export function coerceMissionIntent(value: string | null | undefined): MissionIntent | null {
  switch ((value ?? "").toLowerCase()) {
    case "observe":
    case "investigate":
    case "archive":
    case "launch":
      return (value ?? "").toLowerCase() as MissionIntent;
    default:
      return null;
  }
}

export function coerceMissionOrigin(value: string | null | undefined): MissionOrigin | null {
  return (value ?? "").toLowerCase() === "hq" ? "hq" : null;
}

export function normalizeMissionHandoff(
  missionValue: string | null | undefined,
  fromValue: string | null | undefined,
  sourceValue?: string | null | undefined,
): MissionHandoffState | null {
  const mission = coerceMissionIntent(missionValue);
  const from = coerceMissionOrigin(fromValue);
  if (!mission || !from) return null;
  const trimmedSource = (sourceValue ?? "").trim();
  return {
    mission,
    from,
    source: trimmedSource.length > 0 ? trimmedSource.toLowerCase() : null,
  };
}

export function buildMissionHref(
  baseHref: string,
  mission: MissionIntent,
  options?: { from?: MissionOrigin; source?: string | null },
): string {
  const hashIndex = baseHref.indexOf("#");
  const hash = hashIndex >= 0 ? baseHref.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? baseHref.slice(0, hashIndex) : baseHref;
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);

  params.set("mission", mission);
  params.set("from", options?.from ?? "hq");
  if (options?.source?.trim()) {
    params.set("source", options.source.trim().toLowerCase());
  } else {
    params.delete("source");
  }

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}${hash}` : `${pathname}${hash}`;
}

export function buildMemoryAskHref(query: string): string {
  const trimmed = query.trim();
  return trimmed.length > 0
    ? `/command?memoryAsk=${encodeURIComponent(trimmed)}`
    : "/command";
}

export function getTabFromHref(href: string): string {
  const pathOnly = href.split("?")[0]?.split("#")[0] || "/hq";
  const routeId = pathOnly.replace(/^\//, "").split("/")[0] || "hq";
  return routeId === "hq" ? "home" : routeId;
}

export function resolveMissionContinuationTarget(
  routeHint: string | null | undefined,
): MissionContinuationTarget | null {
  switch ((routeHint ?? "").toLowerCase()) {
    case "/cyber":
      return {
        href: buildMissionHref("/cyber", "investigate", { source: "cyber" }),
        label: "Continue in CYBER",
        tab: "cyber",
      };
    case "/intel":
      return {
        href: buildMissionHref("/intel", "investigate", { source: "intel" }),
        label: "Continue in INTEL",
        tab: "intel",
      };
    case "/alpha":
      return {
        href: "/alpha",
        label: "Continue in ALPHA",
        tab: "alpha",
      };
    case "/vault":
      return {
        href: buildMissionHref("/vault", "archive"),
        label: "Continue in VAULT",
        tab: "vault",
      };
    case "/internal/vehicle":
      return {
        href: buildMissionHref("/vehicle", "launch"),
        label: "Continue in VEHICLE",
        tab: "vehicle",
      };
    case "/labs/signals":
      return {
        href: buildMissionHref("/intel?view=news", "investigate", { source: "intel" }),
        label: "Continue in INTEL",
        tab: "intel",
      };
    case "/labs/ops":
      return {
        href: buildMissionHref("/intel?view=world", "investigate", { source: "intel" }),
        label: "Continue in INTEL",
        tab: "intel",
      };
    default:
      return null;
  }
}
