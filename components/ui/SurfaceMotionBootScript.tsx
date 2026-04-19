import { buildSurfaceMotionBootstrapScript } from "@/lib/surfaceMotionBootstrap";

export default function SurfaceMotionBootScript() {
  return (
    <script
      id="nexus-surface-motion-boot"
      dangerouslySetInnerHTML={{
        __html: buildSurfaceMotionBootstrapScript(),
      }}
      suppressHydrationWarning
    />
  );
}
