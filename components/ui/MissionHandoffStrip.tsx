"use client";

import Link from "next/link";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import { ShellPanel } from "@/components/ui/shell";
import {
  normalizeMissionHandoff,
  type MissionHandoffState,
} from "@/lib/missionHandoff";

type MissionSurface =
  | "command"
  | "intel"
  | "cyber"
  | "vault"
  | "vehicle"
  | "security"
  | "skills";
type MissionTone = "info" | "caution" | "positive" | "neutral";

interface MissionHandoffStripProps {
  surface: MissionSurface;
  mission: string | null | undefined;
  from: string | null | undefined;
  source?: string | null | undefined;
}

interface MissionHandoffContent {
  summary: string;
  detail: string;
  tone: MissionTone;
  contextHint?: string;
}

function getMissionHandoffContent(
  surface: MissionSurface,
  handoff: MissionHandoffState,
): MissionHandoffContent | null {
  if (surface === "command" && handoff.mission === "observe") {
    return {
      summary: "Observe continues here. COMMAND is the first scan for runtime posture, live pressure, and briefings before you branch wider.",
      detail:
        "Start with the Vector snapshot and AI briefing, then widen into investigation or archive the strongest findings once the situation is clear.",
      tone: "info",
      contextHint: "Best next: vector snapshot + AI briefing",
    };
  }

  if (surface === "intel" && handoff.mission === "investigate") {
    return {
      summary:
        handoff.source === "intel"
          ? "Investigate continues here. SPECTRA carries the active intel front from HQ into narrative, world, market, and sweep context."
          : "Investigation continues here. SPECTRA is the wider evidence lane when HQ needs more signal before action.",
      detail:
        "Use the segmented views to move from the current narrative into geopolitics, prediction markets, or sweeps without re-deciding where the mission should live.",
      tone: "caution",
      contextHint:
        handoff.source === "intel"
          ? "Best next: follow the active intel front"
          : "Best next: widen through sweeps",
    };
  }

  if (surface === "cyber" && handoff.mission === "investigate") {
    return {
      summary:
        "Investigate continues here. BASTION is the containment lane for triage, correlated threat signals, and exposed cyber posture.",
      detail:
        "Start in triage to frame urgency, then widen into the matrix, CVEs, OTX, CISA KEV, or drone compliance without losing the original HQ intent.",
      tone: "caution",
      contextHint: "Best next: start in triage",
    };
  }

  if (surface === "vault" && handoff.mission === "archive") {
    return {
      summary:
        "Archive continues here. VAULT is where memory, compiled pages, graph context, and exports get turned into durable operator infrastructure.",
      detail:
        "Use the memory spine, compiled pages, and graph mode to connect what matters before exporting or filing anything for the next session.",
      tone: "positive",
      contextHint: "Best next: memory spine + compiled pages",
    };
  }

  if (surface === "security" && handoff.mission === "investigate") {
    return {
      summary:
        "Investigation continues here. SECURITY is the doctrine lane for route, auth, tool, AI-surface, and physical-ops review before or after implementation work.",
      detail:
        "Start in doctrine or AI surface review to frame the risk properly, then widen into physical monitoring only if the session really needs the operational side.",
      tone: "caution",
      contextHint: "Best next: doctrine + AI surface",
    };
  }

  if (surface === "skills" && handoff.mission === "launch") {
    return {
      summary:
        "Launch prep continues here. SKILLS is the internal workflow lane for shaping processes, stress-testing prompts, and turning experiments into reusable operator capability.",
      detail:
        "Start in Workflow Forge or Blacksite when the work is about improving how Nexus operates rather than running a live mission route.",
      tone: "positive",
      contextHint: "Best next: Workflow Forge + Blacksite",
    };
  }

  if (surface === "vehicle" && handoff.mission === "launch") {
    return {
      summary:
        "Launch prep continues here. VEHICLE keeps bridge posture, connector onboarding, and future hardware recovery flows in one readiness lane.",
      detail:
        "Use connector onboarding, bridge status, first-hardware-day recovery, and session bundles so the real drone arrival becomes a simple connect-and-proceed event.",
      tone: "positive",
      contextHint: "Best next: connector onboarding + bridge status",
    };
  }

  return null;
}

export default function MissionHandoffStrip({
  surface,
  mission,
  from,
  source,
}: MissionHandoffStripProps) {
  const handoff = normalizeMissionHandoff(mission, from, source);
  if (!handoff) return null;

  const content = getMissionHandoffContent(surface, handoff);
  if (!content) return null;

  return (
    <ShellPanel tone="muted" dense>
      <CompactOperatorNote
        label="Continue mission"
        summary={content.summary}
        detail={content.detail}
        tone={content.tone}
      >
        <div className="nexus-mission-handoff__actions">
          {content.contextHint ? (
            <span className="nexus-mission-handoff__chip">{content.contextHint}</span>
          ) : null}
          <Link href="/hq" className="nexus-mission-handoff__link">
            Return to HQ
          </Link>
        </div>
      </CompactOperatorNote>
    </ShellPanel>
  );
}
