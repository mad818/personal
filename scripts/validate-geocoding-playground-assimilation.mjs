#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x geocoding-playground-assimilation: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const route = readRequired("app", "api", "geocode", "route.ts");
const lib = readRequired("lib", "geoCoordinateLookup.ts");
const card = readRequired("components", "recon", "GeocodingPlaygroundCard.tsx");
const recon = readRequired("app", "recon", "page.tsx");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "geocoding-playground.json"),
);

requireText(route, "/api/geocode", "geocode route");
requireText(route, "nominatim", "geocode route");
requireText(lib, "parseNominatimSearchResults", "geoCoordinateLookup.ts");
requireText(card, "/api/geocode", "GeocodingPlaygroundCard.tsx");
requireText(card, "response.ok", "GeocodingPlaygroundCard.tsx");
requireText(card, "payload.status", "GeocodingPlaygroundCard.tsx");
requireText(
  card,
  "previous verified results are retained",
  "GeocodingPlaygroundCard.tsx",
);
requireText(recon, "LazyGeocodingPlaygroundCard", "recon page");

if (parity.status !== "complete") {
  fail("geocoding-playground.json status must be complete");
}

console.log(
  "ok geocoding-playground-assimilation (geocode proxy + RECON playground wired)",
);
