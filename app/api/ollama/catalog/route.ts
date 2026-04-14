import { NextRequest } from "next/server";
import {
  listReachableOllamaModels,
  listRunningOllamaModels,
} from "@/lib/ollamaModelResolver";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

async function buildCatalogResponse(body?: Record<string, unknown>) {
  const endpoint = readOptionalString(body?.endpoint);
  const apiKey = readOptionalString(body?.apiKey);
  const [catalog, running] = await Promise.all([
    listReachableOllamaModels({
      endpoint,
      apiKey,
    }),
    listRunningOllamaModels({
      endpoint,
      apiKey,
    }),
  ]);
  const activeModel =
    running.models.find((model) => typeof model.name === "string" && model.name.trim().length > 0)
      ?.name ??
    running.models.find((model) => typeof model.model === "string" && model.model.trim().length > 0)
      ?.model ??
    null;

  return protectedJson({
    reachable: catalog.reachable || running.reachable,
    models: catalog.models,
    activeModels: running.models,
    activeModel,
    tagsUrl: catalog.tagsUrl,
    psUrl: running.psUrl,
  });
}

export async function GET() {
  return buildCatalogResponse();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return buildCatalogResponse(body);
  } catch {
    return buildCatalogResponse();
  }
}
