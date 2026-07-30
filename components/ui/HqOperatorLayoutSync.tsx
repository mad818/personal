"use client";

import { useEffect } from "react";
import { usePhonePosture } from "@/hooks/usePhonePosture";
import { resolveHqCompactOperator } from "@/lib/hqOperatorLayout";
import { useStore } from "@/store/useStore";

/** Sets `data-nexus-hq-compact-operator` on `<html>` for chat-first HQ layout CSS. */
export default function HqOperatorLayoutSync() {
  const phonePosture = usePhonePosture();
  const hqCompactOperatorLayout = useStore(
    (s) => s.settings.hqCompactOperatorLayout,
  );
  const compact = resolveHqCompactOperator({
    phonePosture,
    hqCompactOperatorLayout,
  });

  useEffect(() => {
    if (compact) {
      document.documentElement.dataset.nexusHqCompactOperator = "true";
    } else {
      delete document.documentElement.dataset.nexusHqCompactOperator;
    }
    return () => {
      delete document.documentElement.dataset.nexusHqCompactOperator;
    };
  }, [compact]);

  return null;
}
