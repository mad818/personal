import { getRoutePolicy } from "@/lib/security/routePolicy";

describe("route policy matching", () => {
  it("prefers the most specific nested route policy", () => {
    expect(getRoutePolicy("/api/health/providers")?.prefix).toBe(
      "/api/health/providers",
    );
    expect(getRoutePolicy("/api/health/usage")?.prefix).toBe(
      "/api/health/usage",
    );
    expect(getRoutePolicy("/api/metrics/runtime-eval/run")?.prefix).toBe(
      "/api/metrics/runtime-eval/run",
    );
  });

  it("keeps public health scoped to the base route only", () => {
    expect(getRoutePolicy("/api/health")?.public).toBe(true);
    expect(getRoutePolicy("/api/health/providers")?.public).toBe(false);
  });

  it("covers newer internal and high-risk Claude-era routes", () => {
    expect(getRoutePolicy("/api/agent-health")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/agent-learnings")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/network-health/check")?.routeClass).toBe(
      "local_only",
    );
    expect(getRoutePolicy("/api/memory/pages")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/memory/ask")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/memory/eval")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/memory/stats")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/memory/search")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/recon/lookup")?.routeClass).toBe(
      "connector_opt_in",
    );
    expect(getRoutePolicy("/api/recon/status")?.routeClass).toBe("local_only");
    expect(getRoutePolicy("/api/recon/passive-dns")?.routeClass).toBe(
      "connector_opt_in",
    );
    expect(getRoutePolicy("/api/recon/tor-check")?.routeClass).toBe(
      "connector_opt_in",
    );
    expect(getRoutePolicy("/api/ai")?.routeClass).toBe("connector_opt_in");
    expect(getRoutePolicy("/api/vault-synthesis")?.routeClass).toBe("high_risk");
    expect(getRoutePolicy("/api/legal-compliance/drone")?.routeClass).toBe(
      "high_risk",
    );
  });

  it("does not match unrelated prefixes accidentally", () => {
    expect(getRoutePolicy("/api/healthcheck")).toBeNull();
  });
});
