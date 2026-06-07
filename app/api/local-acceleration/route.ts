import { NextRequest, NextResponse } from "next/server";
import {
  getLocalAccelerationStatus,
  TURBOQUANT_EXEC_CONFIRMATION,
  turboQuantControl,
  turboVecControl,
  turboVecRemove,
  turboVecSearch,
  turboVecUpsert,
  type TurboQuantControlOperation,
  type TurboVecControlOperation,
  type TurboVecDocument,
  type TurboVecSearchInput,
} from "@/lib/localAcceleration";

export const dynamic = "force-dynamic";

const TURBOVEC_CONTROLS = new Set<TurboVecControlOperation>([
  "prepare",
  "persist",
  "reload",
  "rebuild",
]);
const TURBOQUANT_CONTROLS = new Set<TurboQuantControlOperation>([
  "capabilities",
  "limitations",
  "stats",
  "validate",
  "audit",
  "test",
  "benchmark",
]);

function errorResponse(error: unknown, status = 503) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message.slice(0, 220)
          : "Local acceleration operation failed.",
    },
    { status },
  );
}

export async function GET() {
  try {
    return NextResponse.json(await getLocalAccelerationStatus());
  } catch {
    return NextResponse.json({
      turboVec: { enabled: false, available: false, error: "Status unavailable." },
      turboQuant: { enabled: false, available: false, error: "Status unavailable." },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const operation = typeof body.operation === "string" ? body.operation : "";

    if (operation === "turbovec.search") {
      const matches = await turboVecSearch((body.input ?? {}) as TurboVecSearchInput);
      return NextResponse.json({ matches });
    }
    if (operation === "turbovec.upsert") {
      const result = await turboVecUpsert(
        Array.isArray(body.documents) ? (body.documents as TurboVecDocument[]) : [],
      );
      return NextResponse.json({ result });
    }
    if (operation === "turbovec.remove") {
      const result = await turboVecRemove(
        Array.isArray(body.ids)
          ? body.ids.filter((value): value is string => typeof value === "string")
          : [],
      );
      return NextResponse.json({ result });
    }
    if (operation.startsWith("turbovec.")) {
      const control = operation.slice("turbovec.".length) as TurboVecControlOperation;
      if (!TURBOVEC_CONTROLS.has(control)) {
        return errorResponse("Unknown TurboVec control operation.", 400);
      }
      return NextResponse.json({ result: await turboVecControl(control) });
    }
    if (operation.startsWith("turboquant.")) {
      const control = operation.slice("turboquant.".length) as TurboQuantControlOperation;
      if (!TURBOQUANT_CONTROLS.has(control)) {
        return errorResponse("Unknown TurboQuant control operation.", 400);
      }
      const confirmation =
        typeof body.confirmation === "string" ? body.confirmation : undefined;
      if (
        control !== "capabilities" &&
        control !== "limitations" &&
        control !== "stats" &&
        confirmation !== TURBOQUANT_EXEC_CONFIRMATION
      ) {
        return errorResponse("TurboQuant command confirmation is required.", 409);
      }
      return NextResponse.json({
        result: await turboQuantControl(control, { confirmation }),
      });
    }

    return errorResponse("Unknown local acceleration operation.", 400);
  } catch (error) {
    return errorResponse(error);
  }
}
