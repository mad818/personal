export type ProjectContextSection = "agents" | "standards" | "state" | "bible";

export const PROJECT_CONTEXT_SLICE_HEADINGS = {
  agents: {
    ritual: "## Session Ritual",
    rules: "## Operating Rules",
    verification: "## Verification",
    "file-order": "## File Order Guidance",
  },
  standards: {
    architecture: "## Architecture Standards",
    engineering: "## Engineering Standards",
    process: "## Process",
    ui: "## UI",
    agents: "## Agents",
    eval: "## Eval",
    ops: "## Ops",
    data: "## Data",
    deployment: "## Deployment",
  },
  state: {
    latest: "## Latest Shipped",
    blockers: "## Active Blockers",
    "next-up": "## Next Up",
    "release-posture": "## Release Posture",
    environment: "## Known Environment Issues",
  },
  bible: {
    surfaces: "## Surface Map",
    guarantees: "## Core Product Guarantees",
    "operator-model": "## User And Operator Model",
    direction: "## Long-Horizon Direction",
  },
} as const;

export type ProjectContextSliceMap = typeof PROJECT_CONTEXT_SLICE_HEADINGS;
export type ProjectContextSlice<
  TSection extends ProjectContextSection = ProjectContextSection,
> = keyof ProjectContextSliceMap[TSection] & string;

export function isProjectContextSection(
  value: string | null | undefined,
): value is ProjectContextSection {
  return (
    value === "agents" ||
    value === "standards" ||
    value === "state" ||
    value === "bible"
  );
}

export function readMarkdownSection(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading.trim());
  if (start === -1) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

export function readMarkdownSectionBlock(md: string, heading: string): string {
  const body = readMarkdownSection(md, heading);
  if (!body) return "";
  return `${heading}\n\n${body}`.trim();
}

export function resolveProjectContextSlice(
  section: ProjectContextSection,
  md: string,
  slice: string | null | undefined,
): string {
  if (!slice) return md;
  const sliceHeading =
    PROJECT_CONTEXT_SLICE_HEADINGS[section][
      slice as ProjectContextSlice<typeof section>
    ];
  if (!sliceHeading) return "";
  return readMarkdownSectionBlock(md, sliceHeading);
}
