"use client";

import { toast } from "@/components/ui/Toast";

export async function copyTextWithFeedback(
  text: string,
  label: string,
): Promise<boolean> {
  try {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.clipboard?.writeText !== "function"
    ) {
      throw new Error("Clipboard unavailable");
    }

    await navigator.clipboard.writeText(text);
    toast({
      title: `${label} copied`,
      message: "The text is ready to paste.",
      severity: "low",
    });
    return true;
  } catch {
    toast({
      title: `${label} not copied`,
      message:
        "Clipboard access was unavailable. Keep this panel open and try again.",
      severity: "medium",
    });
    return false;
  }
}
