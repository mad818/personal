#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  normalizeOpsMapViewport,
  OPS_MAP_MAX_ZOOM,
  OPS_MAP_MIN_ZOOM,
  OPS_TACTICAL_ZOOM_DELTA,
  resolveOverviewViewport,
  resolveTacticalViewport,
} from "../lib/opsMapSynchronizedView.ts";

assert.equal(OPS_TACTICAL_ZOOM_DELTA, 2);

assert.deepEqual(
  resolveTacticalViewport({ lat: 34.05, lng: -118.24, zoom: 5 }),
  { lat: 34.05, lng: -118.24, zoom: 7 },
);
assert.deepEqual(
  resolveOverviewViewport({ lat: 34.05, lng: -118.24, zoom: 7 }),
  { lat: 34.05, lng: -118.24, zoom: 5 },
);

assert.deepEqual(
  normalizeOpsMapViewport({
    lat: 120,
    lng: 540,
    zoom: 99,
  }),
  {
    lat: 85,
    lng: -180,
    zoom: OPS_MAP_MAX_ZOOM,
  },
);
assert.deepEqual(
  normalizeOpsMapViewport({
    lat: Number.NaN,
    lng: Number.POSITIVE_INFINITY,
    zoom: Number.NaN,
  }),
  {
    lat: 0,
    lng: 0,
    zoom: OPS_MAP_MIN_ZOOM,
  },
);

assert.equal(
  resolveTacticalViewport({ lat: 0, lng: 0, zoom: OPS_MAP_MAX_ZOOM }).zoom,
  OPS_MAP_MAX_ZOOM,
);
assert.equal(
  resolveOverviewViewport({ lat: 0, lng: 0, zoom: OPS_MAP_MIN_ZOOM }).zoom,
  OPS_MAP_MIN_ZOOM,
);

console.log(
  "ok ops-map-synchronized-view-runtime (translation, normalization, bounds)",
);
