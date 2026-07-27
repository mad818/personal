import assert from "node:assert/strict";
import { CAMPAIGN_DRAFT_WORKFLOW } from "../lib/campaignDraftWorkflow.ts";
import {
  buildLinearWorkflowEdges,
  mergeMissingWorkflowDefinitions,
  moveWorkflowNode,
  moveWorkflowNodeTo,
  normalizeWorkflowNodeOrder,
  parseWorkflowDefinition,
  WORKFLOW_NODE_TYPES,
} from "../lib/workflowDefinition.ts";
import {
  COMPANY_SKILL_SOURCES,
  NEXUS_COMPANY_DEPARTMENTS,
} from "../lib/nexusCompanyMap.ts";

const campaign = CAMPAIGN_DRAFT_WORKFLOW;
assert.equal(campaign.approvalMode, "human_gate");
assert.deepEqual(campaign.tags, ["campaign", "draft-only", "review"]);
assert.ok(campaign.nodes.some((node) => node.type === "approval"));
assert.ok(campaign.nodes.some((node) => node.type === "sink"));
assert.equal(campaign.edges.length, campaign.nodes.length - 1);

const campaignText = JSON.stringify(campaign).toLowerCase();
for (const prohibited of [
  "contact database",
  "lead scoring",
  "tracking pixel",
  "send email",
  "webhook",
  "cron",
  "activate campaign",
]) {
  assert.ok(
    !campaignText.includes(prohibited),
    `campaign seed contains prohibited capability: ${prohibited}`,
  );
}

const operatorCampaign = {
  ...campaign,
  name: "Operator campaign",
  description: "Operator-owned description must survive built-in merging.",
};
const otherDefault = {
  ...campaign,
  id: "wf-other-default",
  name: "Other default",
};
const merged = mergeMissingWorkflowDefinitions(
  [operatorCampaign],
  [campaign, otherDefault],
);
assert.equal(
  merged.filter((workflow) => workflow.id === campaign.id).length,
  1,
);
assert.equal(
  merged.find((workflow) => workflow.id === campaign.id)?.name,
  "Operator campaign",
  "built-in merge overwrote operator workflow",
);
for (const workflow of [campaign, otherDefault]) {
  assert.ok(
    merged.some((entry) => entry.id === workflow.id),
    `missing default ${workflow.id}`,
  );
}

const scrambled = campaign.nodes.map((node, index) => ({
  ...node,
  x: 40 - index,
  y: index + 5,
}));
const normalized = normalizeWorkflowNodeOrder(scrambled);
assert.deepEqual(
  normalized.map((node) => [node.x, node.y]),
  normalized.map((_, index) => [index, 0]),
);

const movedRight = moveWorkflowNode(normalized, normalized[0].id, 1);
assert.equal(movedRight[1].id, normalized[0].id);
const movedToFirst = moveWorkflowNodeTo(
  movedRight,
  movedRight.at(-1).id,
  movedRight[0].id,
);
assert.equal(movedToFirst[0].id, movedRight.at(-1).id);

const rebuiltEdges = buildLinearWorkflowEdges(movedToFirst);
assert.equal(rebuiltEdges.length, movedToFirst.length - 1);
for (let index = 0; index < rebuiltEdges.length; index += 1) {
  assert.equal(rebuiltEdges[index].from, movedToFirst[index].id);
  assert.equal(rebuiltEdges[index].to, movedToFirst[index + 1].id);
  assert.ok(rebuiltEdges[index].id.length <= 96);
}

const parsed = parseWorkflowDefinition({
  ...campaign,
  nodes: movedToFirst,
  edges: rebuiltEdges,
});
assert.equal(parsed.nodes.length, campaign.nodes.length);
assert.deepEqual(WORKFLOW_NODE_TYPES, [
  "source",
  "agent",
  "transform",
  "approval",
  "scheduler",
  "sink",
]);

assert.throws(
  () =>
    parseWorkflowDefinition({
      ...campaign,
      nodes: campaign.nodes.filter((node) => node.type !== "approval"),
      edges: [],
    }),
  /approval node/i,
);
assert.throws(
  () =>
    parseWorkflowDefinition({
      ...campaign,
      nodes: [...campaign.nodes, { ...campaign.nodes[0] }],
    }),
  /unique/i,
);
assert.throws(
  () =>
    parseWorkflowDefinition({
      ...campaign,
      edges: [
        {
          id: "dangling",
          from: campaign.nodes[0].id,
          to: "missing-node",
        },
      ],
    }),
  /different nodes/i,
);
assert.throws(
  () =>
    parseWorkflowDefinition({
      ...campaign,
      nodes: Array.from({ length: 25 }, (_, index) => ({
        ...campaign.nodes[0],
        id: `node-${index}`,
      })),
      edges: [],
    }),
  /1-24/i,
);

const companySource = COMPANY_SKILL_SOURCES.find(
  (source) => source.id === "mautic-campaign-builder",
);
assert.ok(companySource);
assert.equal(companySource.posture, "adapted");
assert.match(companySource.codexPath, /workflow-forge/i);
assert.ok(
  NEXUS_COMPANY_DEPARTMENTS.find(
    (department) => department.id === "marketing-social",
  )?.sourceIds.includes(companySource.id),
);

console.log(
  `ok mautic-campaign-builder (${campaign.nodes.length} seed nodes, complete edit lifecycle, safe default merge, bounded server schema, local human-gated output)`,
);
