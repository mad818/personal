import type { NextResponse } from "next/server";
import type {
  ProtectedActionKind,
  ProtectedActionStatus,
  ToolCapabilityClass,
} from "@/lib/security/toolCapabilityPolicy";

export type ProtectedActionMeta = {
  action: ProtectedActionKind;
  status: ProtectedActionStatus;
  capability?: ToolCapabilityClass;
  blockedReason?: string;
};

export function applyProtectedActionHeaders(
  response: NextResponse,
  meta: ProtectedActionMeta,
) {
  response.headers.set("X-Nexus-Protected-Action", meta.action);
  response.headers.set("X-Nexus-Protected-Status", meta.status);
  if (meta.capability) {
    response.headers.set("X-Tool-Capability", meta.capability);
  }
  if (meta.blockedReason) {
    response.headers.set("X-Nexus-Blocked-Reason", meta.blockedReason);
  }
  if (meta.status === "revalidate") {
    response.headers.set("X-Nexus-Step-Up-Required", "1");
  }
}
