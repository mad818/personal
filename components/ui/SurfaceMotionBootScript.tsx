import { buildSurfaceMotionBootstrapScript } from "@/lib/surfaceMotionBootstrap";

export default function SurfaceMotionBootScript({ nonce }: { nonce?: string }) {
  return (
    <script
      id="nexus-surface-motion-boot"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: buildSurfaceMotionBootstrapScript(),
      }}
      suppressHydrationWarning
    />
  );
}
