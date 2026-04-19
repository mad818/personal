"use client";

import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

export default function SurfaceFocusStrip({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SurfaceCallout
      tone="info"
      compact
      icon="→"
      title={title}
      description={description}
    />
  );
}
