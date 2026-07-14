import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const errors = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) errors.push(`${label}: missing ${text}`);
};

const chrome = read("components/ui/RootLayoutChrome.tsx");
const landing = read("components/landing/LandingPage.tsx");
const nav = read("components/nav/Nav.tsx");
const styles = read("app/globals.css");

for (const text of [
  "function SkipToMainContent()",
  'href="#nexus-main-content"',
  'data-testid="nexus-skip-link"',
  "main.focus({ preventScroll: true })",
  'id="nexus-main-content"',
  "tabIndex={-1}",
]) {
  requireText(chrome, text, "shared chrome");
}

requireText(landing, 'id="nexus-main-content"', "public landing");
requireText(landing, "tabIndex={-1}", "public landing");
requireText(nav, 'aria-label="Primary navigation"', "navigation landmark");
if (nav.includes('role="tablist"')) {
  errors.push("navigation landmark: route links must not be exposed as an ARIA tablist");
}

for (const text of [
  ".nexus-skip-link {",
  ".nexus-skip-link:focus-visible {",
  "transform: translateY(0);",
  "@media (prefers-reduced-motion: reduce)",
]) {
  requireText(styles, text, "skip-link styling");
}

if (errors.length > 0) {
  console.error("Shell accessibility validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Shell accessibility OK (skip path, main targets, navigation semantics, and reduced motion).\n");
