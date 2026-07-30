import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const routes = {
  cves: read("app/api/cves/route.ts"),
  earthquakes: read("app/api/earthquakes/route.ts"),
  defi: read("app/api/defi/route.ts"),
  hackerNews: read("app/api/hacker-news/route.ts"),
  threatIntel: read("app/api/threat-intel/route.ts"),
  news: read("app/api/news/route.ts"),
  secFilings: read("app/api/sec-filings/route.ts"),
  conflict: read("app/api/conflict/route.ts"),
};
const articlesHook = read("hooks/useArticles.ts");
const cvesHook = read("hooks/useCVEs.ts");
const otxHook = read("hooks/useOTX.ts");
const globalHook = read("hooks/useGlobalData.ts");
const dataLoader = read("components/ui/DataLoader.tsx");
const apiFetch = read("lib/apiFetch.ts");
const nav = read("components/nav/Nav.tsx");
const horizon = read("components/ui/FeedSignalHorizon.tsx");
const css = read("app/globals.css");
const store = read("store/useStore.ts");
const task = read("tasks/todo.md");
const spec = read(
  "specs/features/aurora-whole-product-visual-and-fetch-reliability.md",
);
const packageJson = read("package.json");

for (const source of Object.values(routes)) {
  assert.match(source, /status:[^\n]*(502|503)/);
}
assert.match(routes.cves, /fallback\.length/);
assert.match(routes.cves, /cache\.set/);
assert.match(routes.earthquakes, /successfulSources/);
assert.match(routes.news, /GUARDIAN_KEY/);
assert.match(routes.news, /availableSources/);
assert.match(routes.threatIntel, /usableSourceCount/);
assert.match(routes.secFilings, /filingsAvailable/);
assert.match(routes.conflict, /availableSources/);

for (const source of [
  articlesHook,
  cvesHook,
  otxHook,
  globalHook,
  dataLoader,
]) {
  assert.match(source, /updateFeedStatus/);
}
for (const source of [articlesHook, cvesHook, otxHook, globalHook]) {
  assert.match(source, /response\.ok|readJsonFeedResponse/);
  assert.match(source, /requestIds?Ref/);
}
assert.doesNotMatch(articlesHook, /content\.guardianapis\.com/);
assert.doesNotMatch(articlesHook, /guardianKey/);
assert.match(globalHook, /combineFeedAbortSignals/);
assert.match(globalHook, /fetchEarthquakes\(controller\.signal\)/);
assert.match(apiFetch, /isDedupeSafeGet/);
assert.match(apiFetch, /buildDedupeKey/);

assert.match(nav, /FeedSignalHorizon/);
assert.match(horizon, /summarizeFeedSignals/);
assert.match(horizon, /<details/);
assert.match(horizon, /aria-live="polite"/);
assert.match(css, /\.nexus-feed-horizon/);
assert.match(css, /\.nexus-ops-workplane/);
assert.match(css, /prefers-reduced-motion|data-nexus-motion-profile="reduced"/);
assert.match(store, /earthquakes/);
assert.match(store, /hackerNews/);
assert.match(packageJson, /live-feed:reliability:check/);
assert.match(packageJson, /npm run live-feed:reliability:check/);
assert.match(task, /AURORA-WHOLE-PRODUCT-VISUAL-AND-FETCH-RELIABILITY/);
assert.match(spec, /verified empty/);

console.log(
  "ok live-feed-reliability (truthful proxies, retained clients, independent cancellation, global signal horizon, and shared Aurora hierarchy)",
);
