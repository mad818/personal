#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  buildTradeThesisEvidence,
  fallbackTradeThesis,
  parseTradeThesisResponse,
} from "../lib/alphaTradeThesis.ts";
import {
  extractSecCompanyFacts,
  findSecCompanyIdentity,
} from "../lib/secCompanyFacts.ts";

const company = findSecCompanyIdentity(
  {
    0: { cik_str: 1234, ticker: "ACME", title: "Acme Holdings" },
  },
  "acme",
);
assert.deepEqual(company, {
  cik: "0000001234",
  ticker: "ACME",
  title: "Acme Holdings",
});

const companyFacts = extractSecCompanyFacts(
  {
    facts: {
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              {
                val: 100,
                form: "10-K",
                filed: "2025-02-01",
                end: "2024-12-31",
                fy: 2024,
                fp: "FY",
              },
              {
                val: 125,
                form: "10-K",
                filed: "2026-02-01",
                end: "2025-12-31",
                fy: 2025,
                fp: "FY",
              },
            ],
          },
        },
        NetIncomeLoss: {
          units: {
            USD: [
              {
                val: 10,
                form: "10-K",
                filed: "2026-02-01",
                end: "2025-12-31",
                fy: 2025,
                fp: "FY",
              },
            ],
          },
        },
      },
    },
  },
  company,
);
assert.equal(companyFacts.facts.length, 2);
assert.equal(companyFacts.facts[0].label, "Revenue");
assert.equal(companyFacts.facts[0].changePct, 25);

const input = {
  sym: "ACME",
  name: "Acme Holdings",
  price: 50,
  chg24h: 2,
  score: 67,
  label: "constructive",
  trend: 5,
  fearGreedValue: 58,
  fearGreedLabel: "Greed",
};
const evidence = buildTradeThesisEvidence(
  input,
  [
    {
      title: "Acme reports updated results",
      desc: "ACME filing coverage",
      src: "Example News",
      cat: "markets",
      date: "2026-07-27",
    },
    {
      title: "Unrelated security news",
      cat: "cyber",
    },
  ],
  [
    {
      company: "Acme Holdings",
      form: "10-K",
      date: "2026-02-01",
      description: "Annual filing",
      url: "https://www.sec.gov/Archives/edgar/data/example",
    },
  ],
  companyFacts.facts,
);
assert.equal(evidence.news.length, 1);
assert.equal(evidence.fundamentals.length, 2);

const fallback = fallbackTradeThesis(input, evidence);
assert.equal(fallback.analystHandoffs.fundamentals.status, "supported");
assert.match(fallback.conviction.rationale, /not a return probability/i);
assert.equal(fallback.observed.length >= 3, true);
assert.match(fallback.valuationContext, /does not infer fair value/i);

const parsed = parseTradeThesisResponse(
  JSON.stringify({
    entry: "Review only",
    stop: "Invalidation",
    target1: "Scenario A",
    target2: "Scenario B",
    rr: "Unavailable",
    thesis: "Evidence remains mixed.",
    risks: ["Source staleness"],
    observed: ["Observed fact"],
    verifyNext: ["Open the filing"],
    bullCase: "Bull evidence",
    bearCase: "Bear evidence",
    valuationContext: "No fair value estimate",
    conviction: {
      score: 120,
      label: "high",
      rationale: "Coverage only",
    },
    analystHandoffs: {
      fundamentals: {
        status: "supported",
        summary: "Primary facts",
        evidence: ["SEC"],
      },
      technical: {
        status: "limited",
        summary: "Price only",
        evidence: ["Price"],
      },
      sentiment: {
        status: "limited",
        summary: "Headlines only",
        evidence: ["News"],
      },
      risk: {
        status: "limited",
        summary: "Manual sizing",
        evidence: ["Sizer"],
      },
    },
  }),
);
assert.ok(parsed);
assert.equal(parsed.conviction.score, 100);
assert.equal(parsed.analystHandoffs.risk.status, "limited");

console.log(
  "ok financial-research-runtime (sec-facts=2; lenses=4; bull-bear=true; execution=false)",
);
