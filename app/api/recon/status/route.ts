import { protectedJson } from "@/lib/protectedApi";
import { buildBrowserOpsReadinessSnapshot } from "@/lib/nativeAssimilation";
import { readNetworkMode } from "@/lib/security/routePolicy";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = buildBrowserOpsReadinessSnapshot({
    networkMode: readNetworkMode(),
    lightpandaEndpoint:
      process.env.LIGHTPANDA_WS_ENDPOINT ??
      process.env.LIGHTPANDA_URL ??
      process.env.NEXUS_BROWSER_OPS_ENDPOINT ??
      null,
  });

  return protectedJson(snapshot);
}
