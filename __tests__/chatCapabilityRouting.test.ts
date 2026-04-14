import { describe, it, expect } from "vitest";
import {
  detectRouteFromPrompt,
  detectRouteFromTool,
} from "@/lib/chatCapabilityRouting";

// ── detectRouteFromPrompt ─────────────────────────────────────────────────────
describe("detectRouteFromPrompt", () => {
  it("returns null for empty prompt", () => {
    expect(detectRouteFromPrompt("")).toBeNull();
    expect(detectRouteFromPrompt("   ")).toBeNull();
  });

  it("routes crypto/market keywords to /alpha", () => {
    expect(detectRouteFromPrompt("What's the BTC price?")).toBe("/alpha");
    expect(detectRouteFromPrompt("Show me ETH momentum")).toBe("/alpha");
    expect(detectRouteFromPrompt("crypto watchlist scan")).toBe("/alpha");
  });

  it("routes CVE/threat keywords to /cyber", () => {
    expect(detectRouteFromPrompt("Show me latest CVE vulnerabilities")).toBe("/cyber");
    expect(detectRouteFromPrompt("Run a threat intel check")).toBe("/cyber");
    expect(detectRouteFromPrompt("malware detected in OTX feed")).toBe("/cyber");
    expect(detectRouteFromPrompt("/threat-hunt suspicious outbound traffic")).toBe("/cyber");
    expect(detectRouteFromPrompt("/evidence-pack exposed admin panel")).toBe("/cyber");
  });

  it("routes news/articles keywords to /labs/signals", () => {
    expect(detectRouteFromPrompt("What are today's headlines?")).toBe("/labs/signals");
    expect(detectRouteFromPrompt("Show me GDELT news sentiment")).toBe("/labs/signals");
    expect(detectRouteFromPrompt("trending articles from guardian")).toBe("/labs/signals");
  });

  it("routes strategy/framework keywords to /intel", () => {
    expect(detectRouteFromPrompt("Run a Porter 5 forces analysis")).toBe("/intel");
    expect(detectRouteFromPrompt("Check the Polymarket odds")).toBe("/intel");
    expect(detectRouteFromPrompt("Look up SEC filing for Tesla")).toBe("/intel");
    expect(detectRouteFromPrompt("/deepresearch browser prompt caching behavior")).toBe("/intel");
    expect(detectRouteFromPrompt("/lit-review agent reliability papers")).toBe("/intel");
  });

  it("routes world/geo keywords to /labs/ops", () => {
    expect(detectRouteFromPrompt("Show earthquake activity")).toBe("/labs/ops");
    expect(detectRouteFromPrompt("world risk and conflict overview")).toBe("/labs/ops");
    expect(detectRouteFromPrompt("ops map maritime tracking")).toBe("/labs/ops");
  });

  it("routes vault keywords to /vault", () => {
    expect(detectRouteFromPrompt("Show me saved articles in vault")).toBe("/vault");
    expect(detectRouteFromPrompt("Bookmark this article")).toBe("/vault");
  });

  it("routes skill/knowledge keywords to /internal/skills", () => {
    expect(detectRouteFromPrompt("Show the knowledge graph")).toBe("/internal/skills");
    expect(detectRouteFromPrompt("system brain learning overview")).toBe("/internal/skills");
  });

  it("routes IoT/device keywords to /internal/iot", () => {
    expect(detectRouteFromPrompt("IoT device status check")).toBe("/internal/iot");
    expect(detectRouteFromPrompt("sensor dashboard mqtt readings")).toBe("/internal/iot");
  });

  it("picks highest-scoring route when multiple match", () => {
    // "cve" + "vulnerability" both hit /cyber (score=2) vs just one other keyword
    const result = detectRouteFromPrompt("cve exploit vulnerability scan");
    expect(result).toBe("/cyber");
  });

  it("returns null for unrelated prompt", () => {
    expect(detectRouteFromPrompt("What is the meaning of life?")).toBeNull();
    expect(detectRouteFromPrompt("hello how are you")).toBeNull();
  });
});

// ── detectRouteFromTool ───────────────────────────────────────────────────────
describe("detectRouteFromTool", () => {
  it("returns null for undefined tool", () => {
    expect(detectRouteFromTool(undefined)).toBeNull();
    expect(detectRouteFromTool("")).toBeNull();
  });

  it("maps web_search to /labs/signals", () => {
    expect(detectRouteFromTool("web_search")).toBe("/labs/signals");
  });

  it("maps calculate to /alpha", () => {
    expect(detectRouteFromTool("calculate")).toBe("/alpha");
  });

  it("maps remember/recall to /internal/skills", () => {
    expect(detectRouteFromTool("remember")).toBe("/internal/skills");
    expect(detectRouteFromTool("recall")).toBe("/internal/skills");
  });

  it("maps file tools to /vault", () => {
    expect(detectRouteFromTool("write_file")).toBe("/vault");
    expect(detectRouteFromTool("read_file")).toBe("/vault");
    expect(detectRouteFromTool("list_files")).toBe("/vault");
  });

  it("maps project file tools to /internal/skills", () => {
    expect(detectRouteFromTool("read_project_file")).toBe("/internal/skills");
    expect(detectRouteFromTool("patch_project_file")).toBe("/internal/skills");
    expect(detectRouteFromTool("create_project_file")).toBe("/internal/skills");
  });

  it("maps HQ interaction tools to /hq", () => {
    expect(detectRouteFromTool("ask_max")).toBe("/hq");
    expect(detectRouteFromTool("navigate_to")).toBe("/hq");
    expect(detectRouteFromTool("read_current_tab")).toBe("/hq");
    expect(detectRouteFromTool("click_element")).toBe("/hq");
    expect(detectRouteFromTool("type_text")).toBe("/hq");
  });

  it("returns null for unknown tool", () => {
    expect(detectRouteFromTool("unknown_tool_xyz")).toBeNull();
  });
});
