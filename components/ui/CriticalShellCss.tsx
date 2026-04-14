import { getCriticalShellCss } from "@/lib/shellBootstrapGuard";

export default function CriticalShellCss() {
  return (
    <style
      id="nexus-critical-shell-css"
      dangerouslySetInnerHTML={{ __html: getCriticalShellCss() }}
      suppressHydrationWarning
    />
  );
}
