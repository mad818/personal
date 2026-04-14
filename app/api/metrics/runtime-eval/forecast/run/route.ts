import { runForecastEvalRecord } from "@/lib/forecastingRunner";
import { protectedJson } from "@/lib/protectedApi";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const force = Boolean(body?.force);
  const result = await runForecastEvalRecord(force);
  return protectedJson(result, {
    status: result.ok ? 200 : 500,
  });
}
