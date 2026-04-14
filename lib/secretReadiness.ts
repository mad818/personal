const SECRET_PLACEHOLDER_PATTERNS = [
  /^placeholder$/i,
  /^replace[-_ ]?me$/i,
  /^your[-_ ]?(api[-_ ]?)?key$/i,
  /^your[-_ ]?token$/i,
  /^your[-_ ]?secret$/i,
  /^changeme$/i,
  /^set[-_ ]in[-_ ]local[-_ ]env[-_ ]only$/i,
  /^replace[-_ ]with[-_ ]provider[-_ ]key$/i,
  /^replace[-_ ]with[-_ ]long[-_ ]random[-_ ]local[-_ ]token$/i,
  /^replace[-_ ]with[-_ ]readonly[-_ ]local[-_ ]token$/i,
  /^set[-_ ]in[-_ ]readonly[-_ ]local[-_ ]env[-_ ]only$/i,
  /^<set-in-[a-z0-9._-]+>$/i,
  /^<replace-with-[a-z0-9._-]+>$/i,
  /^\.\.\.$/,
];

export function isConfiguredSecretValue(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!normalized) return false;
  return !SECRET_PLACEHOLDER_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}
