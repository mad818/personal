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

  let assignment = value;
  if (assignment.slice(0, 7).toLowerCase() === "export ") {
    assignment = assignment.slice(7).trimStart();
  }
  const equalsIndex = assignment.indexOf("=");
  if (
    equalsIndex >= 0 &&
    assignment.slice(0, equalsIndex).trim().toLowerCase() === "nexus_token"
  ) {
    value = assignment.slice(equalsIndex + 1).trim();
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value.trim();
}
