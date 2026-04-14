import { buildForecastEvalPayload } from "@/lib/forecastingArtifacts";
import { protectedJson } from "@/lib/protectedApi";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(
    5,
    Math.min(120, Number(url.searchParams.get("limit") ?? 24)),
  );
  const freshnessWindowMin = Math.max(
    5,
    Math.min(24 * 60, Number(url.searchParams.get("freshnessMin") ?? 240)),
  );

  return protectedJson(buildForecastEvalPayload(limit, freshnessWindowMin));
}
