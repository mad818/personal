import { NextResponse } from "next/server";
import { applyProtectedApiHeaders, protectedJson } from "@/lib/protectedApi";
import { readSubscriptionEscapeAsset } from "@/lib/subscriptionEscapeAssets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { file: string } },
) {
  try {
    const asset = await readSubscriptionEscapeAsset(params.file);
    const response = new NextResponse(asset.buffer, {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.buffer.byteLength),
      },
    });
    applyProtectedApiHeaders(response.headers);
    return response;
  } catch {
    return protectedJson(
      { error: "Private asset not found." },
      { status: 404 },
    );
  }
}
