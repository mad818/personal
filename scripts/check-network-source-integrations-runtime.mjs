#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  buildEspectreControlEnvelope,
  buildEspectreReadiness,
  normalizeEspectreTelemetry,
} from "../lib/espectre.ts";
import {
  buildMasterDnsVpnReadiness,
  isLoopbackMasterDnsVpnHost,
} from "../lib/masterDnsVpn.ts";

const telemetry = normalizeEspectreTelemetry({
  sensorId: "living room / csi",
  movement_score: 140,
  threshold: -10,
  motion: true,
  consent_confirmed: false,
  calibrated: true,
  transport: "mqtt",
  rawCsi: "must-not-survive-normalization",
});

assert.equal(telemetry.sensorId, "living-room---csi");
assert.equal(telemetry.movementScore, 100);
assert.equal(telemetry.threshold, 1);
assert.equal(telemetry.motionState, "motion");
assert.equal("rawCsi" in telemetry, false);

const readiness = buildEspectreReadiness(telemetry, Date.parse(telemetry.lastSeenAt));
assert.equal(readiness.status, "needs-consent");
assert.equal(readiness.ready, false);

const command = buildEspectreControlEnvelope("living room / csi", "configure", {
  threshold: 250,
  detector: "mlp",
});
assert.equal(typeof command.commandId, "string");
assert.equal(command.payload.threshold, 100);
assert.equal(command.payload.detector, "mlp");
assert.equal(command.delivered, false);
assert.equal(command.reviewRequired, true);

assert.equal(isLoopbackMasterDnsVpnHost("127.0.0.1"), true);
assert.equal(isLoopbackMasterDnsVpnHost("192.168.1.8"), false);

const unsafeTransport = buildMasterDnsVpnReadiness(
  {
    authorized: true,
    delegatedDomainConfigured: true,
    resolverCount: 2,
    encryption: "xor",
    proxyHost: "192.168.1.8",
    proxyPort: 1080,
    localDnsEnabled: true,
    cacheEnabled: true,
    compressionEnabled: true,
    requestPackingEnabled: true,
    externalSocksConfigured: false,
  },
  true,
);
assert.equal(unsafeTransport.status, "misconfigured");
assert.equal(unsafeTransport.ready, false);
assert.match(unsafeTransport.blockers.join(" "), /XOR/);
assert.match(unsafeTransport.blockers.join(" "), /loopback/);

const readyTransport = buildMasterDnsVpnReadiness(
  {
    authorized: true,
    delegatedDomainConfigured: true,
    resolverCount: 2,
    encryption: "chacha20",
    proxyHost: "127.0.0.1",
    proxyPort: 1080,
    localDnsEnabled: true,
    cacheEnabled: true,
    compressionEnabled: true,
    requestPackingEnabled: true,
    externalSocksConfigured: false,
  },
  true,
);
assert.equal(readyTransport.status, "ready");
assert.equal(readyTransport.ready, true);

console.log("ok network-source-integrations-runtime");
