import type { NextResponse } from "next/server";
import type { ToolIsolationDescriptor } from "@/lib/security/toolIsolationPolicy";

export function applyToolIsolationHeaders(
  response: NextResponse,
  meta: ToolIsolationDescriptor,
) {
  response.headers.set("X-Nexus-Isolation-Requirement", meta.requirement);
  response.headers.set("X-Nexus-Isolation-Status", meta.status);
  response.headers.set("X-Nexus-Isolation-Adapter", meta.adapter.id);
  if (meta.blockedReason) {
    response.headers.set("X-Nexus-Isolation-Reason", meta.blockedReason);
  }
}
