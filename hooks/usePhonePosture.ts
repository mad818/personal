"use client";

import { useEffect, useState } from "react";
import { readPhonePostureFromWindow } from "@/lib/phonePosture";

export function usePhonePosture() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readPhonePostureFromWindow();
      setCompact(next);
      document.documentElement.dataset.nexusPhonePosture = next ? "compact" : "standard";
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      delete document.documentElement.dataset.nexusPhonePosture;
    };
  }, []);

  return compact;
}
