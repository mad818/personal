"use client";

import { useEffect } from "react";

const styleOwners = new Map<string, number>();

function styleSelector(id: string) {
  return `style[data-nexus-style="${id}"]`;
}

export default function ClientStyleMount({
  id,
  cssText,
}: {
  id: string;
  cssText: string;
}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let styleEl = document.head.querySelector<HTMLStyleElement>(
      styleSelector(id),
    );
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-nexus-style", id);
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = cssText;
    styleOwners.set(id, (styleOwners.get(id) ?? 0) + 1);

    return () => {
      const nextCount = (styleOwners.get(id) ?? 1) - 1;
      if (nextCount <= 0) {
        styleOwners.delete(id);
        const active = document.head.querySelector<HTMLStyleElement>(
          styleSelector(id),
        );
        active?.remove();
        return;
      }
      styleOwners.set(id, nextCount);
    };
  }, [id, cssText]);

  return null;
}
