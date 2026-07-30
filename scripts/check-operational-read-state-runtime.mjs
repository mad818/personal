#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { loadClientJsonResource } from "../lib/clientJsonResource.ts";
import { isCisaKevPayload } from "../lib/cisaKev.ts";

const validKevEntry = {
  cveID: "CVE-2026-0001",
  vendorProject: "Fixture Vendor",
  product: "Fixture Product",
  vulnerabilityName: "Fixture vulnerability",
  dateAdded: "2026-07-18",
  shortDescription: "Bounded runtime fixture.",
  requiredAction: "Apply the vendor update.",
  dueDate: "2026-08-01",
  knownRansomwareCampaignUse: "Unknown",
};

const validPayload = {
  vulnerabilities: [validKevEntry],
  catalogVersion: "2026.07.18",
  dateReleased: "2026-07-18",
  total: 1,
};

const success = await loadClientJsonResource(
  async () => Response.json(validPayload),
  isCisaKevPayload,
);
assert.deepEqual(success, { ok: true, payload: validPayload });

const failures = await Promise.all([
  loadClientJsonResource(
    async () => Response.json({ error: "unavailable" }, { status: 502 }),
    isCisaKevPayload,
  ),
  loadClientJsonResource(
    async () => new Response("not-json", { status: 200 }),
    isCisaKevPayload,
  ),
  loadClientJsonResource(
    async () => Response.json({ ...validPayload, total: "1" }),
    isCisaKevPayload,
  ),
  loadClientJsonResource(
    async () =>
      Response.json({
        ...validPayload,
        vulnerabilities: [{ ...validKevEntry, dueDate: null }],
      }),
    isCisaKevPayload,
  ),
  loadClientJsonResource(async () => {
    throw new Error("network unavailable");
  }, isCisaKevPayload),
]);

for (const result of failures) assert.deepEqual(result, { ok: false });

console.log(
  "ok operational-read-state-runtime (success, http, json, payload, network)",
);
