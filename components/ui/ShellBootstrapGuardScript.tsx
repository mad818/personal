import { buildShellBootstrapGuardScript } from "@/lib/shellBootstrapGuard";

export default function ShellBootstrapGuardScript() {
  return (
    <script
      id="nexus-shell-bootstrap-guard"
      dangerouslySetInnerHTML={{
        __html: buildShellBootstrapGuardScript(),
      }}
      suppressHydrationWarning
    />
  );
}
