export interface BinaryFormatMatch {
  id:
    | "pe"
    | "elf"
    | "mach-o"
    | "zip"
    | "pdf"
    | "png"
    | "jpeg"
    | "script"
    | "text"
    | "unknown";
  label: string;
  category:
    | "executable"
    | "archive"
    | "document"
    | "media"
    | "script"
    | "unknown";
  detail: string;
}

export interface BinaryIocCandidates {
  urls: string[];
  domains: string[];
  ipv4: string[];
  emails: string[];
}

export interface BinaryTriageInput {
  format: BinaryFormatMatch;
  entropy: number;
  printableStringCount: number;
  iocs: BinaryIocCandidates;
  sampleBytes: number;
  totalBytes: number;
}

export interface BinaryTriageReport {
  fileName: string;
  fileType: string;
  fileSize: number;
  sha256: string;
  sha1: string;
  format: BinaryFormatMatch;
  entropy: number;
  sampleBytes: number;
  printableStrings: string[];
  iocs: BinaryIocCandidates;
  notes: string[];
}

export interface BinaryTriageVaultDraft {
  title: string;
  summary: string;
  content: string;
  tags: string[];
  topic: string;
}

export interface ReverseEngineeringBriefDraft {
  title: string;
  summary: string;
  content: string;
  tags: string[];
  topic: string;
}

export interface BinaryTriageMemoryArtifactShape {
  tags: string[];
  topic?: string | null;
  sourceLabel?: string | null;
}

export interface BinaryTriageBriefSource {
  title: string;
  summary: string;
  content: string;
  tags: string[];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const MACH_O_MAGICS = new Set([
  "feedface",
  "feedfacf",
  "cefaedfe",
  "cffaedfe",
  "cafebabe",
  "bebafeca",
]);

function bytesToHex(bytes: Uint8Array, limit = bytes.length) {
  return Array.from(bytes.slice(0, limit))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isLikelyText(sample: Uint8Array) {
  if (sample.length === 0) return false;
  let printable = 0;
  for (let index = 0; index < sample.length; index += 1) {
    const byte = sample[index]!;
    const isWhitespace = byte === 9 || byte === 10 || byte === 13;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    if (isWhitespace || isPrintableAscii) printable += 1;
  }
  return printable / sample.length > 0.88;
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function extractMarkdownSectionLines(content: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(
    new RegExp(`## ${escapedHeading}\\s*([\\s\\S]*?)(?:\\n## |$)`, "i"),
  );
  if (!match) return [] as string[];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function inferBinarySampleLabel(title: string) {
  return title.replace(/^Binary triage\s*[·-]\s*/i, "").trim() || title.trim();
}

function extractHashLine(content: string, label: string) {
  const match = content.match(
    new RegExp(`-\\s*${label}:\\s*([a-f0-9]{8,128})`, "i"),
  );
  return match?.[1]?.toLowerCase() ?? "";
}

export function buildReverseEngineeringContinuityIdentity(
  source: BinaryTriageBriefSource,
) {
  const sampleLabel = inferBinarySampleLabel(source.title);
  const sha256 = extractHashLine(source.content, "SHA-256");
  const sha1 = extractHashLine(source.content, "SHA-1");
  const anchor = sha256 || sha1 || sampleLabel;
  return slugify(anchor || source.summary || "reverse-engineering-brief");
}

export function buildReverseEngineeringContinuityTag(
  source: BinaryTriageBriefSource,
) {
  return `re-identity:${buildReverseEngineeringContinuityIdentity(source)}`;
}

function buildReverseEngineeringContinuityTags(
  source: BinaryTriageBriefSource,
) {
  return uniqueStrings([
    buildReverseEngineeringContinuityTag(source),
    "continuity:reverse-engineering",
    "route:recon",
    "route:vault",
    "playbook:reverse-engineering-follow-through",
    "spec:reverse-engineering-memory",
  ]);
}

function buildReverseEngineeringNextSteps(source: BinaryTriageBriefSource) {
  const steps: string[] = [];
  const tagSet = new Set(source.tags);
  const iocLines = extractMarkdownSectionLines(
    source.content,
    "IOC candidates",
  );
  const hasNetworkIocs = iocLines.some(
    (line) => !/\bnone\b/i.test(line) && /URLs|Domains|IPv4|Emails/i.test(line),
  );
  const noteLines = extractMarkdownSectionLines(
    source.content,
    "Analyst notes",
  );
  const hasHighEntropySignal = noteLines.some((line) =>
    /high-entropy|packing|obfuscation|encrypted data/i.test(line),
  );

  if (hasNetworkIocs || tagSet.has("network-iocs")) {
    steps.push(
      "Pivot the extracted URLs, domains, IPv4 addresses, or emails into RECON/OSINT follow-up and record which indicators recur across other notes.",
    );
  }
  if (tagSet.has("executable")) {
    steps.push(
      hasHighEntropySignal
        ? "Treat the executable posture as preliminary and confirm packing or obfuscation with deeper static tooling before making stronger claims."
        : "Use deeper static tooling on the executable sample to validate the file family, entry points, and suspicious strings beyond lightweight triage.",
    );
  }
  if (tagSet.has("archive")) {
    steps.push(
      "Enumerate embedded files inside the archive and re-run local triage on the extracted members before escalating the finding.",
    );
  }
  if (tagSet.has("document")) {
    steps.push(
      "Check the document for embedded scripts, macros, or launch chains before treating it as a passive file type.",
    );
  }
  if (tagSet.has("script")) {
    steps.push(
      "Read the full script/source directly and normalize suspicious commands, persistence logic, or outbound endpoints into durable analyst notes.",
    );
  }
  steps.push(
    "Compare the hashes, strings, and IOC hints against existing VAULT memory so the next analyst session starts from linked evidence instead of isolated triage.",
  );
  steps.push(
    "Promote only confirmed findings into a wider operator brief or evidence pack; keep this note scoped to triage-derived evidence and next actions.",
  );
  return uniqueStrings(steps).slice(0, 5);
}

export function detectBinaryFormat(
  sample: Uint8Array,
  fileName = "",
  mimeType = "",
): BinaryFormatMatch {
  const lowerName = fileName.toLowerCase();
  const magic = bytesToHex(sample, 4);

  if (sample.length >= 2 && sample[0] === 0x4d && sample[1] === 0x5a) {
    return {
      id: "pe",
      label: "Portable Executable (PE)",
      category: "executable",
      detail: "Windows executable or DLL signature detected from MZ header.",
    };
  }

  if (
    sample.length >= 4 &&
    sample[0] === 0x7f &&
    sample[1] === 0x45 &&
    sample[2] === 0x4c &&
    sample[3] === 0x46
  ) {
    return {
      id: "elf",
      label: "ELF executable",
      category: "executable",
      detail: "ELF header detected for Linux or Unix-like binaries.",
    };
  }

  if (sample.length >= 4 && MACH_O_MAGICS.has(magic)) {
    return {
      id: "mach-o",
      label: "Mach-O binary",
      category: "executable",
      detail: "Mach-O or universal binary signature detected.",
    };
  }

  if (
    sample.length >= 4 &&
    sample[0] === 0x50 &&
    sample[1] === 0x4b &&
    sample[2] === 0x03 &&
    sample[3] === 0x04
  ) {
    return {
      id: "zip",
      label: "ZIP container",
      category: "archive",
      detail:
        "Archive/container signature detected. Check for embedded scripts or payloads.",
    };
  }

  if (
    sample.length >= 4 &&
    sample[0] === 0x25 &&
    sample[1] === 0x50 &&
    sample[2] === 0x44 &&
    sample[3] === 0x46
  ) {
    return {
      id: "pdf",
      label: "PDF document",
      category: "document",
      detail:
        "PDF signature detected. Treat as document triage before deeper reverse engineering.",
    };
  }

  if (
    sample.length >= 8 &&
    sample[0] === 0x89 &&
    sample[1] === 0x50 &&
    sample[2] === 0x4e &&
    sample[3] === 0x47
  ) {
    return {
      id: "png",
      label: "PNG image",
      category: "media",
      detail:
        "PNG signature detected. This is likely a media artifact rather than an executable.",
    };
  }

  if (
    sample.length >= 3 &&
    sample[0] === 0xff &&
    sample[1] === 0xd8 &&
    sample[2] === 0xff
  ) {
    return {
      id: "jpeg",
      label: "JPEG image",
      category: "media",
      detail:
        "JPEG signature detected. Treat this as media or steganography triage, not native binary RE.",
    };
  }

  const shebang = bytesToHex(sample, 2);
  if (
    shebang === "2321" ||
    lowerName.endsWith(".ps1") ||
    lowerName.endsWith(".js") ||
    lowerName.endsWith(".vbs") ||
    lowerName.endsWith(".sh") ||
    mimeType.startsWith("text/")
  ) {
    return {
      id: "script",
      label: "Script or source text",
      category: "script",
      detail:
        "Readable text/script posture detected. Start with strings and embedded IOCs before heavier tooling.",
    };
  }

  if (isLikelyText(sample)) {
    return {
      id: "text",
      label: "Plain text candidate",
      category: "script",
      detail:
        "Sample is mostly printable text. Prioritize manual reading and IOC extraction first.",
    };
  }

  return {
    id: "unknown",
    label: "Unknown binary",
    category: "unknown",
    detail:
      "No strong signature detected. Use strings, entropy, and hashes to decide whether deeper RE is warranted.",
  };
}

export function computeByteEntropy(sample: Uint8Array) {
  if (sample.length === 0) return 0;
  const counts = new Array<number>(256).fill(0);
  for (let index = 0; index < sample.length; index += 1) {
    counts[sample[index]!] += 1;
  }

  let entropy = 0;
  for (const count of counts) {
    if (count === 0) continue;
    const probability = count / sample.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

export function extractPrintableStrings(
  sample: Uint8Array,
  minLength = 6,
  maxMatches = 80,
) {
  const strings: string[] = [];
  let current = "";

  for (let index = 0; index < sample.length; index += 1) {
    const byte = sample[index]!;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    if (isPrintableAscii) {
      current += String.fromCharCode(byte);
      continue;
    }
    if (current.length >= minLength) {
      strings.push(current);
      if (strings.length >= maxMatches) break;
    }
    current = "";
  }

  if (current.length >= minLength && strings.length < maxMatches) {
    strings.push(current);
  }

  return strings;
}

export function extractIocCandidates(strings: string[]): BinaryIocCandidates {
  const urls = new Set<string>();
  const domains = new Set<string>();
  const ipv4 = new Set<string>();
  const emails = new Set<string>();

  const urlPattern = /\bhttps?:\/\/[^\s"'<>]+/gi;
  const domainPattern = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
  const ipv4Pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

  for (const value of strings) {
    for (const match of value.match(urlPattern) ?? []) urls.add(match);
    for (const match of value.match(domainPattern) ?? []) domains.add(match);
    for (const match of value.match(ipv4Pattern) ?? []) ipv4.add(match);
    for (const match of value.match(emailPattern) ?? []) emails.add(match);
  }

  return {
    urls: Array.from(urls).slice(0, 12),
    domains: Array.from(domains).slice(0, 12),
    ipv4: Array.from(ipv4).slice(0, 12),
    emails: Array.from(emails).slice(0, 12),
  };
}

export function buildBinaryTriageNotes(input: BinaryTriageInput) {
  const notes: string[] = [];

  if (input.format.category === "executable" && input.entropy >= 7.2) {
    notes.push(
      "High-entropy executable sample; packing or obfuscation is plausible.",
    );
  }

  if (input.format.category === "archive") {
    notes.push(
      "Container/archive sample detected; inspect embedded files before deeper reverse engineering.",
    );
  }

  if (input.format.category === "script") {
    notes.push(
      "Readable script/text posture detected; strings and direct code review may be higher-yield than binary tooling first.",
    );
  }

  if (
    input.iocs.urls.length > 0 ||
    input.iocs.domains.length > 0 ||
    input.iocs.ipv4.length > 0
  ) {
    notes.push(
      "Network-oriented indicators are present; pivot into OSINT or sandbox review after local triage.",
    );
  }

  if (input.printableStringCount < 10 && input.entropy >= 6.8) {
    notes.push(
      "Sparse readable strings plus elevated entropy suggest compression, packing, or encrypted data.",
    );
  }

  if (input.sampleBytes < input.totalBytes) {
    notes.push(
      "Entropy, strings, and IOC extraction were sampled from the leading bytes for speed; confirm with deeper tooling if the artifact is important.",
    );
  }

  if (notes.length === 0) {
    notes.push(
      "No urgent red flags surfaced from lightweight local triage; keep the hashes and format classification for follow-on analysis.",
    );
  }

  return notes;
}

export function formatBinarySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isBinaryTriageMemoryArtifact(
  artifact: BinaryTriageMemoryArtifactShape,
) {
  return (
    artifact.tags.includes("binary-triage") ||
    artifact.tags.includes("reverse-engineering-prep") ||
    artifact.topic === "Binary triage" ||
    artifact.sourceLabel === "Binary triage report"
  );
}

export function isReverseEngineeringBriefArtifact(
  artifact: BinaryTriageMemoryArtifactShape,
) {
  return (
    artifact.tags.includes("reverse-engineering-brief") ||
    artifact.tags.includes("derived-from-binary-triage") ||
    artifact.topic === "Reverse engineering brief" ||
    artifact.sourceLabel === "Reverse engineering brief"
  );
}

export function isReverseEngineeringMemoryArtifact(
  artifact: BinaryTriageMemoryArtifactShape,
) {
  return (
    isBinaryTriageMemoryArtifact(artifact) ||
    isReverseEngineeringBriefArtifact(artifact)
  );
}

export function buildBinaryTriageVaultDraft(
  report: BinaryTriageReport,
): BinaryTriageVaultDraft {
  const networkIndicatorCount =
    report.iocs.urls.length +
    report.iocs.domains.length +
    report.iocs.ipv4.length +
    report.iocs.emails.length;
  const tags = [
    "binary-triage",
    "reverse-engineering-prep",
    report.format.id,
    report.format.category,
    networkIndicatorCount > 0 ? "network-iocs" : "no-network-iocs",
    "continuity:reverse-engineering",
    "route:recon",
    "route:vault",
    "playbook:reverse-engineering-follow-through",
    "spec:reverse-engineering-memory",
  ].filter(Boolean);

  return {
    title: `Binary triage · ${report.fileName}`,
    summary: `${report.format.label} · ${formatBinarySize(report.fileSize)} · entropy ${report.entropy.toFixed(2)} · ${networkIndicatorCount} IOC hint${networkIndicatorCount === 1 ? "" : "s"}`,
    topic: "Binary triage",
    tags,
    content: [
      `# Binary triage · ${report.fileName}`,
      "",
      "## Summary",
      `- Format: ${report.format.label}`,
      `- Category: ${report.format.category}`,
      `- Size: ${formatBinarySize(report.fileSize)}`,
      `- MIME type: ${report.fileType || "unknown"}`,
      `- Entropy: ${report.entropy.toFixed(2)} / 8.00`,
      `- Sampled bytes: ${formatBinarySize(report.sampleBytes)}`,
      "",
      "## Hashes",
      `- SHA-256: ${report.sha256}`,
      `- SHA-1: ${report.sha1}`,
      "",
      "## Analyst notes",
      ...report.notes.map((note) => `- ${note}`),
      "",
      "## IOC candidates",
      `- URLs: ${report.iocs.urls.join(", ") || "none"}`,
      `- Domains: ${report.iocs.domains.join(", ") || "none"}`,
      `- IPv4: ${report.iocs.ipv4.join(", ") || "none"}`,
      `- Emails: ${report.iocs.emails.join(", ") || "none"}`,
      "",
      "## Printable strings sample",
      ...(report.printableStrings.length > 0
        ? report.printableStrings.slice(0, 24).map((value) => `- ${value}`)
        : ["- No printable strings surfaced from the sampled bytes."]),
      "",
      "## Handling note",
      "- The raw sample was not uploaded to Nexus. This page stores the triage report only so the reverse-engineering prep can survive beyond the current RECON session.",
    ].join("\n"),
  };
}

export function buildReverseEngineeringBriefDraft(
  source: BinaryTriageBriefSource,
): ReverseEngineeringBriefDraft {
  const sampleLabel = inferBinarySampleLabel(source.title);
  const summaryLines = extractMarkdownSectionLines(source.content, "Summary");
  const hashLines = extractMarkdownSectionLines(source.content, "Hashes");
  const noteLines = extractMarkdownSectionLines(
    source.content,
    "Analyst notes",
  );
  const iocLines = extractMarkdownSectionLines(
    source.content,
    "IOC candidates",
  );
  const nextSteps = buildReverseEngineeringNextSteps(source);
  const carriedTags = source.tags.filter(
    (tag) =>
      tag !== "binary-triage" &&
      tag !== "reverse-engineering-prep" &&
      tag !== "no-network-iocs" &&
      tag !== "network-iocs",
  );
  const tags = uniqueStrings([
    ...carriedTags,
    "reverse-engineering-brief",
    "derived-from-binary-triage",
    ...buildReverseEngineeringContinuityTags(source),
  ]);

  return {
    title: `Reverse-engineering brief · ${sampleLabel}`,
    summary: `Higher-order analyst brief derived from local binary triage · ${source.summary}`,
    topic: "Reverse engineering brief",
    tags,
    content: [
      `# Reverse-engineering brief · ${sampleLabel}`,
      "",
      "## Scope",
      "- Promoted from a durable local binary triage note so the evidence survives as a reusable analyst brief instead of staying at the raw-prep stage.",
      "- The raw sample remained outside Nexus. This brief summarizes triage-derived evidence and follow-up direction only.",
      "",
      "## Observed evidence",
      ...(summaryLines.length > 0
        ? summaryLines.map((line) => `- ${line}`)
        : [`- ${source.summary}`]),
      ...(hashLines.length > 0
        ? ["", "### Hash anchors", ...hashLines.map((line) => `- ${line}`)]
        : []),
      ...(noteLines.length > 0
        ? ["", "### Triage findings", ...noteLines.map((line) => `- ${line}`)]
        : []),
      ...(iocLines.length > 0
        ? ["", "### IOC pivots", ...iocLines.map((line) => `- ${line}`)]
        : []),
      "",
      "## Analyst assessment",
      "- This is still a triage-derived artifact, not a full reverse-engineering verdict. Treat it as a reliable starting point for the next inspection step.",
      "- Keep claims bounded to what the stored triage actually observed: format, hashes, entropy, readable strings, and IOC candidates.",
      "",
      "## Recommended next steps",
      ...nextSteps.map((line) => `- ${line}`),
      "",
      "## Reopen paths",
      "- RECON binary triage: /recon?view=binary&focus=recon-binary",
      "- VAULT reverse-engineering lane: /vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering",
      "- Second-brain export: /vault?focus=vault-export-second-brain",
      "",
      "## Boundary note",
      "- If deeper tooling changes the assessment, file a new durable note rather than overwriting the original triage evidence.",
    ].join("\n"),
  };
}
