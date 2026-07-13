import { NextRequest, NextResponse } from "next/server";
import {
  approveNightShiftProposal,
  captureNightShiftInput,
  getNightShiftProposal,
  prepareNightShift,
  readNightShiftStatus,
  rejectNightShiftProposal,
  runNightShiftAudit,
  stageNightShiftProposal,
} from "@/lib/secondBrainNightShiftServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const proposalId = req.nextUrl.searchParams.get("proposalId")?.trim();
    if (proposalId) {
      const proposal = await getNightShiftProposal(proposalId);
      return proposal
        ? json({ proposal })
        : json({ error: "Pending proposal not found." }, { status: 404 });
    }
    return json(await readNightShiftStatus());
  } catch {
    return json(
      { error: "Could not read the local second-brain night shift." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    switch (body.action) {
      case "capture":
        return json(
          {
            capture: await captureNightShiftInput({
              title: body.title,
              text: body.text,
              sourceUrl: body.sourceUrl,
            }),
          },
          { status: 201 },
        );
      case "prepare":
        return json({ preparation: await prepareNightShift() });
      case "stage":
        return json(
          {
            staged: await stageNightShiftProposal({
              proposal: body.proposal,
              sources: Array.isArray(body.sources)
                ? (body.sources as Array<{ id?: unknown; fingerprint?: unknown }>)
                : [],
            }),
          },
          { status: 201 },
        );
      case "approve":
        return json({ promoted: await approveNightShiftProposal(body.proposalId) });
      case "reject":
        return json({ rejected: await rejectNightShiftProposal(body.proposalId) });
      case "audit":
        return json({ audit: await runNightShiftAudit() }, { status: 201 });
      default:
        return json({ error: "Unknown night-shift action." }, { status: 400 });
    }
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The night-shift action could not be completed.",
      },
      { status: 400 },
    );
  }
}
