import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";

function simulationTone(mode: InternalWorkbenchMeta["simulation"]["mode"]) {
  if (mode === "live") return "success" as const;
  if (mode === "derived") return "info" as const;
  return "default" as const;
}

function simulationBadgeTone(mode: InternalWorkbenchMeta["simulation"]["mode"]) {
  if (mode === "live") return "success" as const;
  if (mode === "derived") return "accent" as const;
  return "muted" as const;
}

export function InternalWorkbenchNotice({
  meta,
  compact = false,
}: {
  meta: InternalWorkbenchMeta | null | undefined;
  compact?: boolean;
}) {
  if (!meta) return null;

  return (
    <SurfaceCallout
      tone={simulationTone(meta.simulation.mode)}
      compact={compact}
      icon="⌁"
      title="Internal operator surface"
      description={
        meta.warnings.length > 0
          ? meta.warnings.join(" ")
          : "This workbench remains internal and follows local-file, non-GA support rules."
      }
      style={{ marginTop: compact ? "8px" : "10px" }}
    >
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <ShellBadge tone="muted">Internal</ShellBadge>
        <ShellBadge tone={simulationBadgeTone(meta.simulation.mode)}>
          {meta.simulation.label}
        </ShellBadge>
        <ShellBadge tone="muted">Local file state</ShellBadge>
      </div>
    </SurfaceCallout>
  );
}
