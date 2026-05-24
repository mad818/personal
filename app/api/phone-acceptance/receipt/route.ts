import { NextRequest } from "next/server";
import { getConfiguredNexusToken } from "@/lib/authSession";
import { protectedJson } from "@/lib/protectedApi";
import {
  appendPhoneAcceptanceReceipt,
  readPhoneAcceptanceReceipts,
  summarizePhoneAcceptanceReceipts,
  type PhoneAcceptanceReceiptInput,
} from "@/lib/phoneAcceptanceReceipts";
import { readProtectedActionContext } from "@/lib/security/toolCapabilityPolicy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function coerceReceiptInput(value: unknown): PhoneAcceptanceReceiptInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PhoneAcceptanceReceiptInput;
}

export async function GET() {
  try {
    const receipts = await readPhoneAcceptanceReceipts();
    const summary = summarizePhoneAcceptanceReceipts(receipts);
    return protectedJson({
      ok: true,
      summary,
      receipts: summary.recent,
    });
  } catch {
    return protectedJson(
      { ok: false, error: "Phone acceptance receipts are unavailable." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let input: PhoneAcceptanceReceiptInput = {};
  try {
    input = coerceReceiptInput(await req.json());
  } catch {
    input = {};
  }

  try {
    const context = await readProtectedActionContext(req);
    const receipt = await appendPhoneAcceptanceReceipt(input, {
      userAgent: req.headers.get("user-agent"),
      sessionAuthenticated: context.sessionAuthenticated,
      tokenConfigured: Boolean(getConfiguredNexusToken()),
      networkMode: context.networkMode,
    });
    const receipts = await readPhoneAcceptanceReceipts();
    const summary = summarizePhoneAcceptanceReceipts(receipts);
    return protectedJson(
      {
        ok: true,
        receipt,
        summary,
      },
      { status: 201 },
    );
  } catch {
    return protectedJson(
      { ok: false, error: "Phone acceptance receipt could not be saved." },
      { status: 500 },
    );
  }
}
