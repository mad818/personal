import { NextRequest, NextResponse } from "next/server";
import {
  FeynmanResearchWatchError,
  runFeynmanResearchWatch,
} from "@/lib/feynmanResearchWatch";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return NextResponse.json(
      await runFeynmanResearchWatch({ id: body.id, topic: body.topic }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof FeynmanResearchWatchError) {
      const status =
        error.kind === "validation"
          ? 400
          : error.kind === "storage"
            ? 500
            : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: "The public arXiv research watch could not run." },
      { status: 500 },
    );
  }
}
