import { NextRequest } from "next/server";
import {
  applyPrivacyShieldHeaders,
  previewPrivacyShieldPayload,
} from "@/lib/privacyShieldServer";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: {
    text?: unknown;
    payload?: unknown;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return protectedJson(
      {
        ok: false,
        error: {
          message: "Invalid JSON body.",
        },
      },
      { status: 400 },
    );
  }

  const payload =
    typeof body.text === "string"
      ? body.text
      : Object.prototype.hasOwnProperty.call(body, "payload")
        ? body.payload
        : "";
  const preview = previewPrivacyShieldPayload(payload);
  const response = protectedJson({
    ok: true,
    preview: {
      ...preview.status,
      safePreview: preview.safePreview,
    },
  });

  applyPrivacyShieldHeaders(response, preview.status.active ? preview.status : null);
  return response;
}
