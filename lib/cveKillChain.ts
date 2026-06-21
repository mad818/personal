// CVE kill-chain stage labeling — display pattern from exploitation-course methodology.
// Advisory only: enriches CVE cards; no exploitation automation.

export type KillChainStage =
  | "Reconnaissance"
  | "Initial Access"
  | "Execution"
  | "Privilege Escalation"
  | "Lateral Movement"
  | "Persistence"
  | "Exfiltration"
  | "Denial of Service";

export const KILL_CHAIN_STAGE_PATTERNS: [KillChainStage, RegExp][] = [
  [
    "Denial of Service",
    /denial.of.service|dos\b|resource exhaustion|memory leak|crash|hang|infinite loop/i,
  ],
  [
    "Exfiltration",
    /data leak|exfiltrat|sensitive.*data|credential.*leak|password.*expos/i,
  ],
  ["Persistence", /backdoor|persist|cron|startup|registry|scheduled task/i],
  [
    "Lateral Movement",
    /ssrf|server-side request|open redirect|credential|token hijack|session fixat/i,
  ],
  [
    "Privilege Escalation",
    /privilege escalat|elevation|local privilege|escalat.*privil|\broot\b|arbitrary.*admin/i,
  ],
  [
    "Execution",
    /remote code exec|command injection|arbitrary code|eval.*inject|shell.*inject/i,
  ],
  [
    "Initial Access",
    /authentication bypass|unauthenticated|sql injection|xss|cross-site|file upload|deserialization|buffer overflow/i,
  ],
  [
    "Reconnaissance",
    /information disclosure|path traversal|directory listing|enumerat|version disclosure/i,
  ],
];

export const KILL_CHAIN_STAGE_COLOR: Record<KillChainStage, string> = {
  Reconnaissance: "#818cf8",
  "Initial Access": "#ef4444",
  Execution: "#dc2626",
  "Privilege Escalation": "#f97316",
  "Lateral Movement": "#f59e0b",
  Persistence: "#a78bfa",
  Exfiltration: "#ec4899",
  "Denial of Service": "#6b7280",
};

export function detectCveKillChainStage(description: string): KillChainStage | null {
  const text = description ?? "";
  for (const [stage, pattern] of KILL_CHAIN_STAGE_PATTERNS) {
    if (pattern.test(text)) return stage;
  }
  return null;
}
