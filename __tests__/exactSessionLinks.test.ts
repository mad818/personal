import {
  getSessionTargetLabel,
  isExactSessionHref,
  normalizeSessionHref,
} from "@/lib/exactSessionLinks";

describe("session link normalization", () => {
  it("normalizes stale home and internal vehicle aliases", () => {
    expect(normalizeSessionHref("/home?focus=hq-chronicle")).toBe("/hq?focus=hq-chronicle");
    expect(normalizeSessionHref("/internal/vehicle?focus=vehicle-connector-onboarding")).toBe(
      "/vehicle?focus=vehicle-connector-onboarding",
    );
  });

  it("infers and repairs Resources view associations", () => {
    expect(normalizeSessionHref("/resources?view=playbook&playbook=safe-refactor")).toBe(
      "/resources?view=playbooks&playbook=safe-refactor",
    );
    expect(normalizeSessionHref("/resources?view=playbooks&playbook=missing-card")).toBe(
      "/resources?view=playbooks&playbook=safe-refactor",
    );
    expect(normalizeSessionHref("/resources?system=vehicle-readiness")).toBe(
      "/resources?system=vehicle-bridge&view=system",
    );
    expect(normalizeSessionHref("/resources?surface=home")).toBe(
      "/resources?surface=hq&view=surfaces",
    );
  });

  it("repairs segmented focus and view mismatches", () => {
    expect(normalizeSessionHref("/recon?focus=recon-binary")).toBe(
      "/recon?focus=recon-binary&view=binary",
    );
    expect(normalizeSessionHref("/cyber?view=triage&focus=cyber-drone")).toBe(
      "/cyber?view=drone&focus=cyber-drone",
    );
    expect(normalizeSessionHref("/skills?view=unknown")).toBe("/skills?view=forge");
  });

  it("pins vault repair params to the correct focused session", () => {
    expect(normalizeSessionHref("/vault?compiledFilter=route-less")).toBe(
      "/vault?compiledFilter=route-less&focus=vault-compiled-pages",
    );
    expect(normalizeSessionHref("/vault?workflowId=market-review")).toBe(
      "/vault?workflowId=market-review&focus=vault-compiled-pages",
    );
    expect(normalizeSessionHref("/vault?focus=vault-graph-focus&compiledFilter=untagged")).toBe(
      "/vault?compiledFilter=untagged&focus=vault-compiled-pages",
    );
    expect(normalizeSessionHref("/vault?graphAudit=orphans")).toBe(
      "/vault?graphAudit=orphans&focus=vault-graph-focus",
    );
  });

  it("keeps exact-session labeling tied to the normalized href", () => {
    expect(isExactSessionHref("/resources?view=playbook&playbook=safe-refactor")).toBe(true);
    expect(getSessionTargetLabel("/vault?compiledFilter=route-less")).toBe("Exact panel");
    expect(getSessionTargetLabel("/vault?workflowId=osint-casefile")).toBe("Exact panel");
    expect(getSessionTargetLabel("/resources")).toBe("Route");
  });
});
