import { buildPersistedShellStateRepairScript } from "@/lib/persistedShellState";

export default function PersistedShellStateBootScript() {
  return (
    <script
      id="nexus-persisted-shell-state-boot"
      dangerouslySetInnerHTML={{
        __html: buildPersistedShellStateRepairScript(),
      }}
      suppressHydrationWarning
    />
  );
}
