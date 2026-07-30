import { NextRequest, NextResponse } from "next/server";
import { isFeynmanContinuityArtifactKind } from "@/lib/feynmanContinuity";
import { readFeynmanContinuityArtifact } from "@/lib/feynmanContinuityStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim() ?? "";
  const artifactKind = req.nextUrl.searchParams.get("artifact")?.trim() ?? "";
  if (!sessionId || !isFeynmanContinuityArtifactKind(artifactKind)) {
    return NextResponse.json(
      { error: "A valid sessionId and fixed artifact kind are required." },
      { status: 400 },
    );
  }

  try {
    const artifact = await readFeynmanContinuityArtifact(
      sessionId,
      artifactKind,
    );
    const response = new NextResponse(new Uint8Array(artifact.buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${artifact.disposition}; filename="${sessionId}-${artifact.fileName}"`,
        "Content-Type": artifact.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
    if (artifactKind === "preview") {
      response.headers.set(
        "Content-Security-Policy",
        "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      );
    }
    return response;
  } catch {
    return NextResponse.json(
      { error: "Feynman artifact not found." },
      { status: 404 },
    );
  }
}
