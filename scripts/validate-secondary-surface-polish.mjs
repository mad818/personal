import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const checks = [
  {
    file: "components/security/CameraGrid.tsx",
    forbidden: ["Feed placeholder"],
    required: ["Passive feed tile", "PASSIVE PREVIEW", "RTSP/ONVIF READY"],
  },
  {
    file: "components/security/DronePanel.tsx",
    forbidden: ["Map placeholder"],
    required: [
      "Passive position plot",
      "Simulation only - no arm/steer/mode switch",
    ],
  },
  {
    file: "components/iot/SensorDashboard.tsx",
    forbidden: ["SparklinePlaceholder", "placeholder mapping"],
    required: ["SensorSparkline", "deterministic sparklines"],
  },
  {
    file: "lib/voiceLab.ts",
    forbidden: ["Voice briefing placeholder"],
    required: ["Draft a short local-first command briefing"],
  },
  {
    file: "components/ui/DataLoadingState.tsx",
    forbidden: [],
    required: ['role="status"', 'aria-live="polite"', 'aria-busy="true"'],
  },
  {
    file: "components/intel/GeoDeltaPanel.tsx",
    forbidden: ["void fetch("],
    required: [
      "try {",
      "if (!response.ok)",
      "<DataLoadingState",
      'role="alert"',
      "Retry geo delta",
    ],
  },
  {
    file: "components/resources/RegistryConsole.tsx",
    forbidden: ["void fetch("],
    required: [
      "try {",
      "if (!response.ok)",
      "<DataLoadingState",
      'role="alert"',
      "Retry registry",
    ],
  },
  {
    file: "components/skills/WorkflowForge.tsx",
    forbidden: ["void Promise.all(", "const [busy, setBusy]"],
    required: [
      "try {",
      "if (!response.ok)",
      "<DataLoadingState",
      'role="alert"',
      "Retry workflow data",
      'busyAction === "save"',
      'busyAction === "clone"',
      'busyAction === "run"',
      'busyAction === "copy"',
      'title: "Workflow graph not saved"',
      'title: "Workflow run failed"',
    ],
  },
];

const errors = [];

for (const check of checks) {
  const source = fs.readFileSync(path.join(repoRoot, check.file), "utf8");
  for (const phrase of check.forbidden) {
    if (source.includes(phrase)) {
      errors.push(`${check.file}: remove stale phrase "${phrase}"`);
    }
  }
  for (const phrase of check.required) {
    if (!source.includes(phrase)) {
      errors.push(`${check.file}: missing polish proof phrase "${phrase}"`);
    }
  }
}

function collectTsxSources(relativeDirectory) {
  const sources = [];
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
        if (relativePath === "components/home/arpg") continue;
        pending.push(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        sources.push({
          relativePath,
          source: fs.readFileSync(absolutePath, "utf8"),
        });
      }
    }
  }

  return sources;
}

function inspectPromiseChain(expression) {
  if (!ts.isCallExpression(expression)) {
    return { tracked: false, handled: false };
  }

  if (ts.isIdentifier(expression.expression)) {
    return {
      tracked: expression.expression.text === "fetch",
      handled: false,
    };
  }

  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return { tracked: false, handled: false };
  }

  const owner = expression.expression.expression;
  const method = expression.expression.name.text;
  if (method === "all" && ts.isIdentifier(owner) && owner.text === "Promise") {
    return { tracked: true, handled: false };
  }

  const parent = inspectPromiseChain(owner);
  if (!parent.tracked) return parent;
  return {
    tracked: true,
    handled:
      parent.handled ||
      method === "catch" ||
      (method === "then" && expression.arguments.length >= 2),
  };
}

function isTrackedAsyncCall(node) {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text === "fetch";
  }
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "all" &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "Promise"
  );
}

function hasRejectionHandler(node, boundary) {
  for (
    let parent = node.parent;
    parent && parent !== boundary;
    parent = parent.parent
  ) {
    if (
      ts.isCallExpression(parent) &&
      ts.isPropertyAccessExpression(parent.expression) &&
      (parent.expression.name.text === "catch" ||
        (parent.expression.name.text === "then" &&
          parent.arguments.length >= 2))
    ) {
      return true;
    }
    if (
      ts.isTryStatement(parent) &&
      parent.tryBlock.pos <= node.pos &&
      node.end <= parent.tryBlock.end
    ) {
      return true;
    }
  }
  return false;
}

function loaderHasUnguardedSource(loader) {
  let tracked = false;
  let unguarded = false;

  function visit(node) {
    if (node !== loader && ts.isFunctionLike(node)) return;
    if (isTrackedAsyncCall(node)) {
      tracked = true;
      if (!hasRejectionHandler(node, loader)) unguarded = true;
    }
    ts.forEachChild(node, visit);
  }

  visit(loader);
  return tracked && unguarded;
}

function findIgnoredPromiseChains(source, relativePath) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];
  const unsafeLoaders = new Set();

  function collectLoaders(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (loaderHasUnguardedSource(node)) unsafeLoaders.add(node.name.text);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer)) &&
      loaderHasUnguardedSource(node.initializer)
    ) {
      unsafeLoaders.add(node.name.text);
    }
    ts.forEachChild(node, collectLoaders);
  }

  collectLoaders(sourceFile);

  function visit(node) {
    if (ts.isVoidExpression(node)) {
      const chain = inspectPromiseChain(node.expression);
      if (chain.tracked && !chain.handled) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} ignores a fetch/Promise.all chain without rejection handling`,
        );
      } else if (
        ts.isCallExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        unsafeLoaders.has(node.expression.expression.text)
      ) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} invokes a local loader with an unguarded fetch/Promise.all source`,
        );
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

const fetchFixtureViolations = findIgnoredPromiseChains(
  `
    void fetch("/bad").then(read);
    void Promise.all([loadOne(), loadTwo()]).then(render);
    void fetch("/caught").then(read).catch(recover);
    void fetch("/rejected").then(read, recover);
    const loadWithoutCatch = async () => {
      await fetch("/also-bad");
    };
    const loadWithInternalTryCatch = async () => {
      try {
        await fetch("/guarded");
      } catch {}
    };
    void loadWithoutCatch();
    void loadWithInternalTryCatch();
  `,
  "client-fetch-fixture.tsx",
);
if (fetchFixtureViolations.length !== 3) {
  errors.push(
    "client fetch resilience: AST self-test must reject ignored chains while accepting explicit rejection paths and guarded loaders",
  );
}

for (const { relativePath, source } of [
  ...collectTsxSources("app"),
  ...collectTsxSources("components"),
]) {
  errors.push(...findIgnoredPromiseChains(source, relativePath));
}

if (errors.length > 0) {
  console.error("Secondary surface polish validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Secondary surface polish OK (camera, drone, IoT, voice, and client fetch states are explicit).",
);
