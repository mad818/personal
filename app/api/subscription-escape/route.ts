import { NextRequest } from "next/server";
import {
  SUBSCRIPTION_ESCAPE_GUARDRAILS,
  SUBSCRIPTION_ESCAPE_SOURCES,
  SUBSCRIPTION_REPLACEMENT_CATALOG,
  type SubscriptionEscapeState,
} from "@/lib/subscriptionEscape";
import {
  getSubscriptionEscapeStoragePath,
  readSubscriptionEscapeState,
  writeSubscriptionEscapeState,
} from "@/lib/subscriptionEscapeStore";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await readSubscriptionEscapeState();
  return protectedJson({
    state,
    catalog: SUBSCRIPTION_REPLACEMENT_CATALOG,
    sources: SUBSCRIPTION_ESCAPE_SOURCES,
    guardrails: SUBSCRIPTION_ESCAPE_GUARDRAILS,
    storage: {
      pathHint: "data/subscription-escape.json",
      configured: Boolean(process.env.NEXUS_SUBSCRIPTION_ESCAPE_FILE),
      resolvedPath: process.env.NODE_ENV === "development" ? getSubscriptionEscapeStoragePath() : undefined,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { state?: Partial<SubscriptionEscapeState> };
    if (!body?.state) {
      return protectedJson(
        { error: "Missing subscription escape state payload." },
        { status: 400 },
      );
    }

    const state = await writeSubscriptionEscapeState(body.state);
    return protectedJson({ state });
  } catch {
    return protectedJson(
      { error: "Unable to save subscription escape state." },
      { status: 400 },
    );
  }
}
