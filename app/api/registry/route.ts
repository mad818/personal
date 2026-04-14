import { NextRequest, NextResponse } from "next/server";
import {
  listAssetKits,
  listRegistryItems,
  saveAssetKit,
  saveRegistryItem,
} from "@/lib/assimilation/storage";
import { registryMutationSchema } from "@/lib/assimilation/contracts";
import {
  applyWorkbenchRateLimit,
  createWorkbenchMeta,
  parseWorkbenchPayload,
  workbenchError,
  workbenchJson,
} from "@/lib/assimilation/http";

export const dynamic = "force-dynamic";

const RATE_LIMIT = {
  bucket: "workbench-registry",
  windowMs: 60_000,
  maxAttempts: 60,
  includeBearerToken: false,
} as const;

export async function GET(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "registry-console",
    simulation: "seeded",
    warnings: [
      "Registry data is persisted locally and may include seeded defaults or workflow-derived artifacts.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const [items, kits] = await Promise.all([listRegistryItems(), listAssetKits()]);
  return workbenchJson(meta, { items, kits });
}

export async function POST(req: NextRequest) {
  const meta = createWorkbenchMeta({
    surface: "registry-console",
    simulation: "seeded",
    warnings: [
      "Registry data is persisted locally and may include seeded defaults or workflow-derived artifacts.",
    ],
  });
  const rateLimited = applyWorkbenchRateLimit(req, RATE_LIMIT, meta);
  if (rateLimited) return rateLimited;

  const parsed = parseWorkbenchPayload(
    registryMutationSchema,
    await req.json(),
    meta,
  );
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;

  if ("item" in body && body.item) {
    const item = await saveRegistryItem(body.item);
    return workbenchJson(meta, { item });
  }
  if ("kit" in body && body.kit) {
    const kit = await saveAssetKit(body.kit);
    return workbenchJson(meta, { kit });
  }
  return workbenchError(meta, {
    status: 400,
    code: "invalid_request",
    message: "Missing registry item or kit payload.",
  });
}
