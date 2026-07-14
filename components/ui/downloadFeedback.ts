"use client";

import { toast } from "@/components/ui/Toast";

interface TextDownloadRequest {
  filename: string;
  content: BlobPart | BlobPart[];
  label: string;
  mimeType?: string;
  announce?: boolean;
}

export function requestTextDownload({
  filename,
  content,
  label,
  mimeType = "text/plain;charset=utf-8",
  announce = true,
}: TextDownloadRequest): boolean {
  let anchor: HTMLAnchorElement | null = null;
  let objectUrl: string | null = null;

  try {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      !document.body ||
      typeof window.URL?.createObjectURL !== "function"
    ) {
      throw new Error("Browser downloads are unavailable.");
    }

    const parts = Array.isArray(content) ? content : [content];
    objectUrl = window.URL.createObjectURL(new Blob(parts, { type: mimeType }));
    anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();

    if (announce) {
      toast({
        title: `${label} download requested`,
        message: `Check your browser downloads for ${filename}.`,
        severity: "low",
      });
    }
    return true;
  } catch {
    if (announce) {
      toast({
        title: `${label} not prepared`,
        message:
          "The browser could not start this download. Keep the panel open and retry.",
        severity: "medium",
      });
    }
    return false;
  } finally {
    anchor?.remove();
    if (objectUrl && typeof window !== "undefined") {
      const urlToRevoke = objectUrl;
      window.setTimeout(() => window.URL.revokeObjectURL(urlToRevoke), 0);
    }
  }
}
