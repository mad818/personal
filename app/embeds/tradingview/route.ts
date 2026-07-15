import { type NextRequest, NextResponse } from "next/server";
import { CONTENT_SECURITY_POLICY_NONCE_HEADER } from "@/lib/security/contentSecurityPolicy";
import {
  buildTradingViewEmbedHtml,
  parseTradingViewEmbedKind,
} from "@/lib/security/tradingViewEmbed";

const EMBED_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Language": "en",
  "Content-Type": "text/html; charset=utf-8",
} as const;

export function GET(request: NextRequest) {
  const kind = parseTradingViewEmbedKind(
    request.nextUrl.searchParams.get("kind"),
  );
  if (!kind) {
    return new NextResponse("Unsupported TradingView widget.", {
      status: 400,
      headers: EMBED_RESPONSE_HEADERS,
    });
  }

  const nonce = request.headers.get(CONTENT_SECURITY_POLICY_NONCE_HEADER) ?? "";
  try {
    return new NextResponse(buildTradingViewEmbedHtml(kind, nonce), {
      status: 200,
      headers: EMBED_RESPONSE_HEADERS,
    });
  } catch {
    return new NextResponse("TradingView embed unavailable.", {
      status: 500,
      headers: EMBED_RESPONSE_HEADERS,
    });
  }
}
