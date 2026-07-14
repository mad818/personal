import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const interactiveTags = new Set([
  "button",
  "a",
  "Link",
  "motion.button",
  "motion.a",
  "ShellButton",
]);
const actionableButtonTags = new Set([
  "button",
  "motion.button",
  "ShellButton",
]);
const formControlTags = new Set(["input", "select", "textarea"]);
const pointerContainerTags = new Set([
  "div",
  "span",
  "motion.div",
  "motion.span",
]);
const interactiveRoles = new Set([
  "button",
  "checkbox",
  "link",
  "menuitem",
  "option",
  "radio",
  "switch",
  "tab",
]);
const privateRpgPrefix = "components/home/arpg/";
const meaningfulTextPattern = /[\p{L}\p{N}]/u;

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
        if (!`${relativePath}/`.startsWith(privateRpgPrefix)) {
          pending.push(absolutePath);
        }
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
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text.trim().length > 0;
  }
  return true;
}

function mergeEvidence(...items) {
  return {
    meaningful: items.some((item) => item.meaningful),
    dynamic: items.some((item) => item.dynamic),
  };
}

function inspectStaticText(text) {
  return {
    meaningful: meaningfulTextPattern.test(text),
    dynamic: false,
  };
}

function inspectExpression(expression) {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return inspectExpression(expression.expression);
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isNumericLiteral(expression)
  ) {
    return inspectStaticText(expression.text);
  }

  if (ts.isTemplateExpression(expression)) {
    return mergeEvidence(
      inspectStaticText(expression.head.text),
      ...expression.templateSpans.flatMap((span) => [
        inspectExpression(span.expression),
        inspectStaticText(span.literal.text),
      ]),
    );
  }

  if (ts.isConditionalExpression(expression)) {
    return mergeEvidence(
      inspectExpression(expression.whenTrue),
      inspectExpression(expression.whenFalse),
    );
  }

  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return mergeEvidence(
      inspectExpression(expression.left),
      inspectExpression(expression.right),
    );
  }

  if (
    expression.kind === ts.SyntaxKind.NullKeyword ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    ts.isArrowFunction(expression) ||
    ts.isFunctionExpression(expression)
  ) {
    return { meaningful: false, dynamic: false };
  }

  return { meaningful: false, dynamic: true };
}

function isAriaHidden(openingElement, sourceFile) {
  const attribute = getJsxAttribute(openingElement, sourceFile, "aria-hidden");
  if (!attribute?.initializer) return false;
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text === "true";
  }
  if (!ts.isJsxExpression(attribute.initializer)) return false;
  return attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword;
}

function inspectAttribute(openingElement, sourceFile, attributeName) {
  const attribute = getJsxAttribute(openingElement, sourceFile, attributeName);
  if (!attribute?.initializer) return { meaningful: false, dynamic: false };
  if (ts.isStringLiteral(attribute.initializer)) {
    return inspectStaticText(attribute.initializer.text);
  }
  if (!ts.isJsxExpression(attribute.initializer)) {
    return { meaningful: false, dynamic: false };
  }
  return attribute.initializer.expression
    ? inspectExpression(attribute.initializer.expression)
    : { meaningful: false, dynamic: false };
}

function inspectJsxChild(child, sourceFile) {
  if (ts.isJsxText(child)) return inspectStaticText(child.text);

  if (ts.isJsxExpression(child)) {
    return child.expression
      ? inspectExpression(child.expression)
      : { meaningful: false, dynamic: false };
  }

  if (ts.isJsxElement(child)) {
    if (isAriaHidden(child.openingElement, sourceFile)) {
      return { meaningful: false, dynamic: false };
    }
    const tagName = child.openingElement.tagName.getText(sourceFile);
    return mergeEvidence(
      tagName === "img"
        ? inspectAttribute(child.openingElement, sourceFile, "alt")
        : { meaningful: false, dynamic: false },
      ...child.children.map((nestedChild) =>
        inspectJsxChild(nestedChild, sourceFile),
      ),
    );
  }

  if (ts.isJsxSelfClosingElement(child)) {
    if (isAriaHidden(child, sourceFile)) {
      return { meaningful: false, dynamic: false };
    }
    return child.tagName.getText(sourceFile) === "img"
      ? inspectAttribute(child, sourceFile, "alt")
      : { meaningful: false, dynamic: false };
  }

  if (ts.isJsxFragment(child)) {
    return mergeEvidence(
      ...child.children.map((nestedChild) =>
        inspectJsxChild(nestedChild, sourceFile),
      ),
    );
  }

  return { meaningful: false, dynamic: false };
}

function isInteractive(openingElement, sourceFile) {
  if (interactiveTags.has(openingElement.tagName.getText(sourceFile))) {
    return true;
  }
  return interactiveRoles.has(
    getLiteralAttributeValue(
      getJsxAttribute(openingElement, sourceFile, "role"),
    ),
  );
}

function hasLiteralPointerCursor(openingElement, sourceFile) {
  const style = getJsxAttribute(openingElement, sourceFile, "style");
  if (
    !style?.initializer ||
    !ts.isJsxExpression(style.initializer) ||
    !style.initializer.expression ||
    !ts.isObjectLiteralExpression(style.initializer.expression)
  ) {
    return false;
  }

  return style.initializer.expression.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      property.name.getText(sourceFile) === "cursor" &&
      ts.isStringLiteralLike(property.initializer) &&
      property.initializer.text === "pointer",
  );
}

function hasCompleteKeyboardFallback(openingElement, sourceFile) {
  const role = getLiteralAttributeValue(
    getJsxAttribute(openingElement, sourceFile, "role"),
  );
  return (
    interactiveRoles.has(role) &&
    Boolean(getJsxAttribute(openingElement, sourceFile, "tabIndex")) &&
    Boolean(
      getJsxAttribute(openingElement, sourceFile, "onKeyDown") ||
      getJsxAttribute(openingElement, sourceFile, "onKeyUp"),
    )
  );
}

function containsNestedInteractiveControl(node, sourceFile) {
  if (!ts.isJsxElement(node)) return false;
  let found = false;

  function visit(descendant) {
    if (found) return;
    const openingElement = ts.isJsxSelfClosingElement(descendant)
      ? descendant
      : ts.isJsxElement(descendant)
        ? descendant.openingElement
        : null;

    if (
      openingElement &&
      (isInteractive(openingElement, sourceFile) ||
        formControlTags.has(openingElement.tagName.getText(sourceFile)))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(descendant, visit);
  }

  for (const child of node.children) {
    visit(child);
  }
  return found;
}

function isDefinitePointerOnlyContainer(node, openingElement, sourceFile) {
  return (
    pointerContainerTags.has(openingElement.tagName.getText(sourceFile)) &&
    Boolean(getJsxAttribute(openingElement, sourceFile, "onClick")) &&
    hasLiteralPointerCursor(openingElement, sourceFile) &&
    !hasCompleteKeyboardFallback(openingElement, sourceFile) &&
    !containsNestedInteractiveControl(node, sourceFile)
  );
}

function isInsideForm(node, sourceFile) {
  let parent = node.parent;
  while (parent && !ts.isSourceFile(parent)) {
    if (
      ts.isJsxElement(parent) &&
      parent.openingElement.tagName.getText(sourceFile) === "form"
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function isFormSubmitControl(node, openingElement, sourceFile) {
  const type = getLiteralAttributeValue(
    getJsxAttribute(openingElement, sourceFile, "type"),
  );
  const submitType = !type || type === "submit";
  return (
    Boolean(getJsxAttribute(openingElement, sourceFile, "formAction")) ||
    (submitType &&
      (isInsideForm(node, sourceFile) ||
        Boolean(getJsxAttribute(openingElement, sourceFile, "form"))))
  );
}

function isSuppressionCall(expression) {
  return (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ["preventDefault", "stopImmediatePropagation", "stopPropagation"].includes(
      expression.expression.name.text,
    )
  );
}

function isSuppressionOnlyClickHandler(attribute) {
  if (
    !attribute?.initializer ||
    !ts.isJsxExpression(attribute.initializer) ||
    !attribute.initializer.expression ||
    !ts.isArrowFunction(attribute.initializer.expression)
  ) {
    return false;
  }

  const body = attribute.initializer.expression.body;
  if (!ts.isBlock(body)) return isSuppressionCall(body);
  if (body.statements.length === 0) return true;

  return body.statements.every((statement) => {
    if (ts.isExpressionStatement(statement)) {
      return isSuppressionCall(statement.expression);
    }
    return (
      ts.isReturnStatement(statement) &&
      Boolean(statement.expression && isSuppressionCall(statement.expression))
    );
  });
}

function inspectSource(sourceText, relativePath) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];
  let namedCount = 0;

  function visit(node) {
    const openingElement = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxElement(node)
        ? node.openingElement
        : null;

    if (openingElement && isInteractive(openingElement, sourceFile)) {
      const explicitlyNamed =
        hasNonEmptyAttribute(openingElement, sourceFile, "aria-label") ||
        hasNonEmptyAttribute(openingElement, sourceFile, "aria-labelledby");
      const contentEvidence = ts.isJsxElement(node)
        ? mergeEvidence(
            ...node.children.map((child) => inspectJsxChild(child, sourceFile)),
          )
        : { meaningful: false, dynamic: false };

      if (
        explicitlyNamed ||
        contentEvidence.meaningful ||
        contentEvidence.dynamic
      ) {
        namedCount += 1;
      } else {
        const location = sourceFile.getLineAndCharacterOfPosition(
          openingElement.getStart(sourceFile),
        );
        const tagName = openingElement.tagName.getText(sourceFile);
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} <${tagName}> has no reliable programmatic name`,
        );
      }
    }

    if (
      openingElement &&
      isDefinitePointerOnlyContainer(node, openingElement, sourceFile)
    ) {
      const location = sourceFile.getLineAndCharacterOfPosition(
        openingElement.getStart(sourceFile),
      );
      const tagName = openingElement.tagName.getText(sourceFile);
      violations.push(
        `${relativePath}:${location.line + 1}:${location.character + 1} <${tagName}> is pointer-only; use a native control or add role, tabIndex, and keyboard activation`,
      );
    }

    if (
      openingElement &&
      actionableButtonTags.has(openingElement.tagName.getText(sourceFile))
    ) {
      const onClick = getJsxAttribute(openingElement, sourceFile, "onClick");
      const location = sourceFile.getLineAndCharacterOfPosition(
        openingElement.getStart(sourceFile),
      );
      const tagName = openingElement.tagName.getText(sourceFile);

      if (onClick && isSuppressionOnlyClickHandler(onClick)) {
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} <${tagName}> click handler has no action beyond event suppression`,
        );
      } else if (
        !onClick &&
        !isFormSubmitControl(node, openingElement, sourceFile)
      ) {
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} <${tagName}> has no activation path`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { violations, namedCount };
}

const fixture = inspectSource(
  `
    <>
      <button aria-label="Dismiss" onClick={run}>✕</button>
      <a href="/report">Read report</a>
      <Link href="/report">{label}</Link>
      <button aria-labelledby="fixture-title" onClick={run}><Icon /></button>
      <button onClick={run}>{loading ? "…" : "Refresh"}</button>
      <button title="Close" onClick={run}>✕</button>
      <button onClick={run}>{active ? "…" : "▶"}</button>
      <span role="button" onClick={run}>⚙</span>
      <button onClick={run}><Icon aria-hidden="true" /></button>
      <motion.button onClick={run}>Review</motion.button>
      <ShellButton onClick={run}>{actionLabel}</ShellButton>
      <motion.button onClick={run}>★</motion.button>
      <ShellButton title="Close" onClick={run}>✕</ShellButton>
    </>
  `,
  "interactive-accessibility-fixture.tsx",
);

if (fixture.namedCount !== 7 || fixture.violations.length !== 6) {
  console.error("Interactive accessibility validator self-test failed.");
  process.exit(1);
}

const pointerFixture = inspectSource(
  `
    <>
      <div onClick={run} style={{ cursor: "pointer" }}>Open queue</div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={handleKey}
        onClick={run}
        style={{ cursor: "pointer" }}
      >
        Open queue
      </div>
      <div onClick={close} style={{ position: "fixed" }} />
      <div onClick={noop} style={{ cursor: "pointer" }}>
        <button onClick={run}>Nested action</button>
      </div>
    </>
  `,
  "pointer-accessibility-fixture.tsx",
);

if (pointerFixture.namedCount !== 2 || pointerFixture.violations.length !== 1) {
  console.error("Pointer accessibility validator self-test failed.");
  process.exit(1);
}

const actionFixture = inspectSource(
  `
    <>
      <button type="button">Dead action</button>
      <button onClick={(event) => event.stopPropagation()}>Snapshot</button>
      <button onClick={run}>Run check</button>
      <form onSubmit={save}>
        <button type="submit">Save</button>
      </form>
    </>
  `,
  "action-accessibility-fixture.tsx",
);

if (actionFixture.namedCount !== 4 || actionFixture.violations.length !== 2) {
  console.error("Action accessibility validator self-test failed.");
  process.exit(1);
}

const files = [...collectTsxFiles("app"), ...collectTsxFiles("components")];
const violations = [];
let namedCount = 0;

for (const file of files) {
  const result = inspectSource(
    fs.readFileSync(file.absolutePath, "utf8"),
    file.relativePath,
  );
  violations.push(...result.violations);
  namedCount += result.namedCount;
}

if (violations.length > 0) {
  console.error("Interactive accessibility validation failed:");
  for (const violation of violations.sort()) {
    console.error(`- ${violation}`);
  }
  console.error(
    "Add meaningful visible text and a real activation path, or remove the control. Title, punctuation, emoji, symbol-only content, and suppression-only handlers do not count.",
  );
  process.exit(1);
}

console.log(
  `Interactive accessibility OK (${namedCount} controls named, no definite pointer-only containers or dead button actions, private RPG lane excluded).`,
);
