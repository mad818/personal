import { NextRequest } from "next/server";
import { protectedJson } from "@/lib/protectedApi";
import { saveSubscriptionEscapeAsset } from "@/lib/subscriptionEscapeAssets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (
      !file ||
      typeof file === "string" ||
      typeof file.arrayBuffer !== "function"
    ) {
      return protectedJson({ error: "Missing image file." }, { status: 400 });
    }

    const saved = await saveSubscriptionEscapeAsset(file);
    return protectedJson(saved);
  } catch {
    return protectedJson(
      { error: "Unable to store private media image." },
      { status: 400 },
    );
  }
}
