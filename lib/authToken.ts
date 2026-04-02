export function normalizeTokenCandidate(raw: string): string {
  let value = raw.replace(/^\uFEFF/, "").trim();
  if (!value) return "";

  const firstNonEmptyLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (firstNonEmptyLine) {
    value = firstNonEmptyLine;
  }

  const assignmentMatch = value.match(
    /^(?:export\s+)?NEXUS_TOKEN\s*=\s*(.+)$/i,
  );
  if (assignmentMatch) {
    value = assignmentMatch[1].trim();
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value.trim();
}
