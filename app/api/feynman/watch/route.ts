import { NextResponse } from "next/server";
import {
  FeynmanResearchWatchError,
  listFeynmanResearchWatches,
} from "@/lib/feynmanResearchWatch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listFeynmanResearchWatches(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof FeynmanResearchWatchError
        ? error.message
        : "The local Feynman research-watch state could not be read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
