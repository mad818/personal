const REGION_ALIASES: Record<string, string[]> = {
  gaza: ["gaza", "palestine", "hamas"],
  israel: ["israel", "gaza", "idf", "hezbollah"],
  ukraine: ["ukraine", "kyiv", "zelensky"],
  russia: ["russia", "moscow", "kremlin", "putin"],
  taiwan: ["taiwan", "taipei"],
  china: ["china", "beijing", "prc"],
  iran: ["iran", "tehran"],
  "middle-east": [
    "middle east",
    "gaza",
    "israel",
    "iran",
    "yemen",
    "syria",
    "lebanon",
  ],
};

export function normalizeIntelRegion(region: string): string {
  return region.trim().toLowerCase().replace(/\s+/g, "-");
}

export function formatIntelRegionLabel(region: string): string {
  return normalizeIntelRegion(region)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function matchesIntelRegion(title: string, region: string): boolean {
  const norm = normalizeIntelRegion(region);
  if (!norm) return true;

  const haystack = title.toLowerCase();
  const needles = new Set<string>([
    norm,
    norm.replace(/-/g, " "),
    ...(REGION_ALIASES[norm] ?? []),
  ]);

  for (const needle of needles) {
    if (needle && haystack.includes(needle)) return true;
  }
  return false;
}
