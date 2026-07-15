import { buildPersistedShellStateRepairScript } from "@/lib/persistedShellState";

export default function PersistedShellStateBootScript({
  nonce,
}: {
  nonce?: string;
}) {
  return (
    <script
      id="nexus-persisted-shell-state-boot"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: buildPersistedShellStateRepairScript(),
      }}
      suppressHydrationWarning
    />
  );
}
