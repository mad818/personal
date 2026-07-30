import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const formControlTags = new Set(["input", "textarea", "select"]);

function collectTsxFiles(relativeDirectory) {
  const files = [];
  const pending = [path.join(repoRoot, relativeDirectory)];

  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) continue;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path
        .relative(repoRoot, absolutePath)
        .replaceAll("\\", "/");

      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        files.push({ absolutePath, relativePath });
      }
    }
  }

  return files;
}

function getJsxAttribute(openingElement, sourceFile, attributeName) {
  return openingElement.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText(sourceFile) === attributeName,
  );
}

function getLiteralAttributeValue(attribute) {
  if (!attribute?.initializer || !ts.isStringLiteral(attribute.initializer)) {
    return null;
  }
  return attribute.initializer.text.trim() || null;
}

function hasNonEmptyAttribute(openingElement, sourceFile, attributeName) {
  const attribute = getJsxAttribute(openingElement, sourceFile, attributeName);
  if (!attribute?.initializer) return false;

  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text.trim().length > 0;
  }

  if (!ts.isJsxExpression(attribute.initializer)) return false;
  const expression = attribute.initializer.expression;
  if (!expression) return false;
  if (ts.isStringLiteral(expression)) {
    return expression.text.trim().length > 0;
  }
  if (ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text.trim().length > 0;
  }
  return true;
}

function isWrappedByLabel(node) {
  let parent = node.parent;
  while (parent && !ts.isSourceFile(parent)) {
    if (
      ts.isJsxElement(parent) &&
      parent.openingElement.tagName.getText() === "label"
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function collectLiteralLabelTargets(sourceFile) {
  const targets = new Set();

  function visit(node) {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(sourceFile) === "label"
    ) {
      const htmlFor = getJsxAttribute(
        node.openingElement,
        sourceFile,
        "htmlFor",
      );
      const target = getLiteralAttributeValue(htmlFor);
      if (target) targets.add(target);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return targets;
}

function inspectSource(sourceText, relativePath) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const labelTargets = collectLiteralLabelTargets(sourceFile);
  const violations = [];
  let namedCount = 0;
  let hiddenCount = 0;

  function visit(node) {
    const openingElement = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxElement(node)
        ? node.openingElement
        : null;

    if (
      openingElement &&
      formControlTags.has(openingElement.tagName.getText(sourceFile))
    ) {
      const tagName = openingElement.tagName.getText(sourceFile);
      const type = getLiteralAttributeValue(
        getJsxAttribute(openingElement, sourceFile, "type"),
      );

      if (tagName === "input" && type === "hidden") {
        hiddenCount += 1;
      } else {
        const id = getLiteralAttributeValue(
          getJsxAttribute(openingElement, sourceFile, "id"),
        );
        const named =
          isWrappedByLabel(node) ||
          Boolean(id && labelTargets.has(id)) ||
          hasNonEmptyAttribute(openingElement, sourceFile, "aria-label") ||
          hasNonEmptyAttribute(openingElement, sourceFile, "aria-labelledby");

        if (named) {
          namedCount += 1;
        } else {
          const location = sourceFile.getLineAndCharacterOfPosition(
            openingElement.getStart(sourceFile),
          );
          violations.push(
            `${relativePath}:${location.line + 1}:${location.character + 1} <${tagName}> has no programmatic name`,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { violations, namedCount, hiddenCount };
}

const fixture = inspectSource(
  `
    <>
      <label>Wrapped <input /></label>
      <label htmlFor="associated">Associated</label>
      <input id="associated" />
      <textarea aria-label="Explicit name" />
      <select aria-labelledby="fixture-title" />
      <input type="hidden" />
      <input placeholder="Not a label" />
    </>
  `,
  "form-accessibility-fixture.tsx",
);

if (
  fixture.namedCount !== 4 ||
  fixture.hiddenCount !== 1 ||
  fixture.violations.length !== 1
) {
  console.error("Form accessibility validator self-test failed.");
  process.exit(1);
}

const files = [...collectTsxFiles("app"), ...collectTsxFiles("components")];
const violations = [];
let namedCount = 0;
let hiddenCount = 0;

for (const file of files) {
  const result = inspectSource(
    fs.readFileSync(file.absolutePath, "utf8"),
    file.relativePath,
  );
  violations.push(...result.violations);
  namedCount += result.namedCount;
  hiddenCount += result.hiddenCount;
}

if (violations.length > 0) {
  console.error("Form accessibility validation failed:");
  for (const violation of violations.sort()) {
    console.error(`- ${violation}`);
  }
  console.error(
    "Add a native label association, non-empty aria-label, or non-empty aria-labelledby. Placeholder and title text do not count.",
  );
  process.exit(1);
}

console.log(
  `Form accessibility OK (${namedCount} controls named, ${hiddenCount} hidden inputs excluded).`,
);
