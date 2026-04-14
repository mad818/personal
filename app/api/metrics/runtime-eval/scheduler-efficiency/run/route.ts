import {
  runSchedulerEfficiencyRecord,
} from "@/lib/schedulerEfficiencyRunner";
import { protectedJson } from "@/lib/protectedApi";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const force = Boolean(body?.force);
  const result = await runSchedulerEfficiencyRecord(force);
  return protectedJson(result, {
    status: result.ok ? 200 : 500,
  });
}
