import { NextRequest, NextResponse } from "next/server";
import { applyProtectedApiHeaders, protectedJson } from "@/lib/protectedApi";
import { readSubscriptionEscapeAsset } from "@/lib/subscriptionEscapeAssets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  try {
    const { file } = await params;
    const asset = await readSubscriptionEscapeAsset(file);
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
