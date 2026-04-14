import { describe, expect, it } from "vitest";
import {
  normalizeCanonicalResourceParams,
  normalizeCanonicalVaultParams,
} from "@/lib/assistantCanonicalRegistry";

describe("assistant canonical registry", () => {
  it("normalizes stale resource aliases into canonical exact-session params", () => {
    const params = new URLSearchParams("view=playbook&playbook=safe-refactors");

    normalizeCanonicalResourceParams(params);

    expect(params.get("view")).toBe("playbooks");
    expect(params.get("playbook")).toBe("safe-refactor");
  });

  it("heals vault repair params into the matching exact session", () => {
    const params = new URLSearchParams("compiledFilter=route-less");

    normalizeCanonicalVaultParams(params);

    expect(params.get("focus")).toBe("vault-compiled-pages");
    expect(params.get("compiledFilter")).toBe("route-less");
    expect(params.has("graphAudit")).toBe(false);
  });

  it("preserves supported vault workflow filters inside the compiled-pages session", () => {
    const params = new URLSearchParams("workflowId=market-review");

    normalizeCanonicalVaultParams(params);

    expect(params.get("focus")).toBe("vault-compiled-pages");
    expect(params.get("workflowId")).toBe("market-review");
    expect(params.has("graphAudit")).toBe(false);
  });
});
