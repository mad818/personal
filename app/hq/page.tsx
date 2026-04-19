// ── hq/page ────────────────────────────────────────────────
// Canonical HQ route: live command shell.

import OfficeCommandCenter from "@/components/home/office/OfficeCommandCenter";
import { ShellStage } from "@/components/ui/shell";

export default function HQPage() {
  return (
    <ShellStage surface="hq">
      <OfficeCommandCenter />
    </ShellStage>
  );
}
