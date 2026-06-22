"use client";

import { usePhonePosture } from "@/hooks/usePhonePosture";

/** Mount once in the shell; sets `data-nexus-phone-posture` on `<html>`. */
export default function PhonePostureSync() {
  usePhonePosture();
  return null;
}
