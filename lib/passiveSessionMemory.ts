const MAX_TRAIL_ENTRIES = 24;

export function buildPassiveSessionMemoryNote(args: {
  target: string;
  query: string;
  result: string;
  capturedAt?: number;
}): string {
  const ts = new Date(args.capturedAt ?? Date.now()).toISOString();
  const agent = args.target.toUpperCase();
  const querySnippet = args.query.replace(/\s+/g, " ").trim().slice(0, 72);
  const firstLine = args.result
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 12);
  const outcomeSnippet = (firstLine ?? args.result).replace(/\s+/g, " ").slice(0, 120);
  return `${ts} | ${agent} | "${querySnippet}" → ${outcomeSnippet}`;
}

export function appendPassiveMemoryTrail(
  trail: string[],
  note: string,
  maxEntries = MAX_TRAIL_ENTRIES,
): string[] {
  const normalized = note.trim();
  if (!normalized) return trail;
  return [normalized, ...trail.filter((entry) => entry !== normalized)].slice(
    0,
    maxEntries,
  );
}

export function buildPassiveMemoryTrailBlock(trail: string[]): string {
  if (!trail.length) return "";
  const lines = trail.slice(0, 5).map((entry, index) => `${index + 1}. ${entry}`);
  return (
    `\n\n[PASSIVE SESSION MEMORY — recent HQ runs]\n` +
    `${lines.join("\n")}\n` +
    `[END PASSIVE SESSION MEMORY]\n`
  );
}
