import { describe, expect, it } from "vitest";
import {
  buildHQRetrievalRetryDirective,
  hasVerifiedRetrievalStep,
  healHQAnswerForChronicle,
  resolveHQAnswerStylePlan,
  resolveHQTargetAgent,
} from "@/components/home/office/hqAnswerStyle";

describe("HQ answer style routing", () => {
  it("defaults a casual greeting to conversational Jansky with quiet context", () => {
    const plan = resolveHQAnswerStylePlan("Hello there");

    expect(plan.style).toBe("conversational");
    expect(plan.responseKind).toBe("assistant");
    expect(plan.includeLiveContext).toBe(false);
    expect(plan.includeRag).toBe(false);
    expect(plan.includeLessons).toBe(false);
    expect(resolveHQTargetAgent(plan, "nova")).toBe("jansky");
  });

  it("marks latest/current questions as retrieval-sensitive", () => {
    const plan = resolveHQAnswerStylePlan("What are the latest BTC headlines?");

    expect(plan.style).toBe("live_current");
    expect(plan.responseKind).toBe("evidence");
    expect(plan.verifiedRetrievalRequired).toBe(true);
    expect(plan.showEvidencePosture).toBe(true);
    expect(resolveHQTargetAgent(plan, "jansky")).toBe("nova");
    expect(resolveHQTargetAgent(plan, "flux")).toBe("flux");
  });

  it("routes repo questions into engineering posture", () => {
    const plan = resolveHQAnswerStylePlan("Fix the bug in lib/agent.ts");

    expect(plan.style).toBe("repo_work");
    expect(plan.responseKind).toBe("evidence");
    expect(plan.includeRag).toBe(true);
    expect(plan.includeLessons).toBe(true);
    expect(resolveHQTargetAgent(plan, "cipher")).toBe("orbit");
  });

  it("routes learning prompts into guided-learning posture", () => {
    const plan = resolveHQAnswerStylePlan("Teach me how the memory spine works");

    expect(plan.style).toBe("learning");
    expect(plan.responseKind).toBe("assistant");
    expect(plan.includeRag).toBe(true);
    expect(plan.includeLessons).toBe(true);
    expect(plan.verifiedRetrievalRequired).toBe(false);
    expect(resolveHQTargetAgent(plan, "nova")).toBe("jansky");
  });
});

describe("HQ answer healing", () => {
  it("collapses memo-style conversational drift into a normal greeting", () => {
    const plan = resolveHQAnswerStylePlan("Hello");
    const raw = `**Background**
Global markets show mixed momentum.

**Analysis**
No active tasks are marked pending in docs/SYSTEM_STATE.md.

**Recommendation**
Ready for your input. Priorities:
1. Confirm GitHub sync status
2. Address any codebase updates

How would you like to proceed?`;

    expect(healHQAnswerForChronicle(raw, plan)).toBe(
      "Hello. How can I help today?",
    );
  });

  it("removes generic follow-up boilerplate from product-help turns", () => {
    const plan = resolveHQAnswerStylePlan("Where is the settings drawer?");
    const raw = `**Recommendation**
Open the top-right settings button from the top rail. It opens the drawer without leaving HQ.

How would you like to proceed?`;

    expect(healHQAnswerForChronicle(raw, plan)).toBe(
      "Open the top-right settings button from the top rail. It opens the drawer without leaving HQ.",
    );
  });

  it("detects verified retrieval steps for live-query safeguards", () => {
    expect(
      hasVerifiedRetrievalStep([
        { type: "thinking", content: "Planning" },
        { type: "tool_call", content: "{}", tool: "web_search" },
      ]),
    ).toBe(true);
    expect(
      hasVerifiedRetrievalStep([
        { type: "tool_call", content: "{}", tool: "calculate" },
      ]),
    ).toBe(false);
    expect(buildHQRetrievalRetryDirective()).toContain("must use web_search");
  });
});
