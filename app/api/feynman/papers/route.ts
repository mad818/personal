import { NextRequest, NextResponse } from "next/server";
import {
  FeynmanPaperLibraryError,
  listFeynmanPaperLibrary,
  searchFeynmanPaperLibrary,
  updateFeynmanPaperAnnotation,
} from "@/lib/feynmanPaperLibrary";

export const dynamic = "force-dynamic";

function boundedLimit(value: string | null) {
  const parsed = Number(value ?? "20");
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(40, Math.floor(parsed)));
}

function errorResponse(error: unknown) {
  if (error instanceof FeynmanPaperLibraryError) {
    const status =
      error.kind === "validation"
        ? 400
        : error.kind === "not_found"
          ? 404
          : error.kind === "inspection"
            ? 502
            : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(
    { error: "The local Feynman paper library operation failed." },
    { status: 500 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";
    const limit = boundedLimit(req.nextUrl.searchParams.get("limit"));
    return NextResponse.json(
      query
        ? await searchFeynmanPaperLibrary(query, { limit })
        : await listFeynmanPaperLibrary({ limit }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return NextResponse.json(
      await updateFeynmanPaperAnnotation({
        id: typeof body.id === "string" ? body.id : "",
        annotation: body.annotation,
        tags: body.tags,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
