import { NextResponse } from "next/server";
import {
  buildMcpGatewayHealthSummary,
  executeMcpGatewayTool,
} from "@/lib/mcpGatewayAdapter";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = buildMcpGatewayHealthSummary();
    return protectedJson(health);
  } catch {
    return NextResponse.json(
      { error: "MCP gateway descriptor unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      tool?: string;
      args?: Record<string, unknown>;
      stepUpToken?: string;
    };

    const tool = typeof body.tool === "string" ? body.tool.trim() : "";
    if (!tool) {
      return NextResponse.json(
        { error: "Request body must include { tool: string, args?: object }." },
        { status: 400 },
      );
    }

    const args =
      body.args && typeof body.args === "object" && !Array.isArray(body.args)
        ? body.args
        : {};

    const outcome = await executeMcpGatewayTool({
      tool,
      args,
      stepUpToken: typeof body.stepUpToken === "string" ? body.stepUpToken : undefined,
    });

    return NextResponse.json(
      outcome.ok ? { ok: true, result: outcome.result } : { ok: false, error: outcome.error },
      { status: outcome.httpStatus },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON with { tool, args? }." },
      { status: 400 },
    );
  }
}
