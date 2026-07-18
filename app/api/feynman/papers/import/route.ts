import { NextRequest, NextResponse } from "next/server";
import {
  addFeynmanPaperToLibrary,
  FeynmanPaperLibraryError,
} from "@/lib/feynmanPaperLibrary";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const reference =
      typeof body.reference === "string" ? body.reference.trim() : "";
    return NextResponse.json(await addFeynmanPaperToLibrary(reference), {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof FeynmanPaperLibraryError) {
      const status =
        error.kind === "validation"
          ? 400
          : error.kind === "inspection"
            ? 502
            : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: "The public arXiv paper could not be imported." },
      { status: 500 },
    );
  }
}
