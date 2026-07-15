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
  {
    file: "components/iot/EspectreWifiViewer.tsx",
    forbidden: [],
    required: [
      'method: "POST"',
      "if (!response.ok)",
      "Unable to prepare command envelope.",
    ],
  },
  {
    file: "components/ui/clipboardFeedback.ts",
    forbidden: [],
    required: [
      'typeof navigator === "undefined"',
      "await navigator.clipboard.writeText(text)",
      "`${label} copied`",
      "`${label} not copied`",
      'severity: "medium"',
    ],
  },
  {
    file: "components/resources/VoiceLabConsole.tsx",
    forbidden: ["/api/voice/projects", "/api/voice/profiles"],
    required: ["upsertVoiceProject(project)", "upsertVoiceProfile(profile)"],
  },
  {
    file: "components/home/office/FileBackButton.tsx",
    forbidden: [],
    required: [
      "const [saving, setSaving]",
      "if (!response.ok)",
      'title: "VAULT answer not filed"',
      'saving ? "Filing..." : "File"',
    ],
  },
  {
    file: "components/home/office/OfficeCommandCenter.tsx",
    forbidden: [],
    required: [
      "const [loggingLesson, setLoggingLesson]",
      "lessonLogging={loggingLesson}",
      'title: "Lesson not logged"',
    ],
  },
  {
    file: "components/home/office/HQTerminalSection.tsx",
    forbidden: [],
    required: ["lessonLogging: boolean", '"Logging…"'],
  },
  {
    file: "components/vault/VaultLibrarianPanel.tsx",
    forbidden: [],
    required: [
      'title: "Audit brief not filed"',
      'title: "VAULT answer not filed"',
      "if (!response.ok)",
    ],
  },
  {
    file: "components/ui/downloadFeedback.ts",
    forbidden: [],
    required: [
      "document.body.appendChild(anchor)",
      "anchor.click()",
      "`${label} download requested`",
      "`${label} not prepared`",
      "window.setTimeout(() => window.URL.revokeObjectURL(urlToRevoke), 0)",
    ],
  },
  {
    file: "components/vault/VaultExport.tsx",
    forbidden: ["silent failure — user will see nothing downloaded"],
    required: [
      'title: "VAULT export requested"',
      'title: "Second-brain downloads requested"',
      "Allow multiple downloads if your browser asks.",
    ],
  },
  {
    file: "components/resources/EscapeAccessBackupPanel.tsx",
    forbidden: ['setMessage("Backup downloaded.")'],
    required: ["Backup download requested.", "Backup download failed."],
  },
  {
    file: "components/resources/SpecDrivenConsole.tsx",
    forbidden: ['"downloaded"', "Starter downloaded"],
    required: ['"requested"', "Download requested"],
  },
  {
    file: "components/resources/PlaybooksConsole.tsx",
    forbidden: ['"downloaded"', "Brief downloaded"],
    required: ['"requested"', "Download requested"],
  },
  {
    file: "components/ui/RuntimeEvalTrend.tsx",
    forbidden: ["Diagnostics exported."],
    required: [
      "Diagnostics download requested.",
      "Diagnostics download failed.",
    ],
  },
  {
    file: "components/recon/OpsecPanel.tsx",
    forbidden: [
      "All checks run locally — nothing leaves your browser",
      'note: isTor ? "Tor exit node detected — high anonymity"',
      "check.torproject.org",
    ],
    required: [
      'result: "idle" | "checking" | "ok" | "warn" | "unknown"',
      'result: "unknown"',
      "Tor status not queried — Nexus does not send your browser IP to Tor Project",
      "setScore(Math.round((s / 80) * 100))",
      "WebRTC contacts Google STUN; Tor status is not sent to Tor Project.",
      "WebRTC status unknown — the STUN probe did not complete",
    ],
  },
  {
    file: "components/security/SecurityDoctrineMatrix.tsx",
    forbidden: ["if (!response.ok) return"],
    required: [
      "const [reviewingScenarioId, setReviewingScenarioId]",
      "if (!response.ok)",
      'title: "Doctrine status saved"',
      'title: "Doctrine status not saved"',
      'reviewingScenarioId === scenario.id\n                    ? "Saving..."',
    ],
  },
];

const errors = [];

function containsFormatIndependentPhrase(source, phrase) {
  if (source.includes(phrase)) return true;
  const normalizedSource = source.replace(/\s+/g, " ");
  const normalizedPhrase = phrase.replace(/\s+/g, " ").trim();
  return normalizedSource.includes(normalizedPhrase);
}

for (const check of checks) {
  const source = fs.readFileSync(path.join(repoRoot, check.file), "utf8");
  for (const phrase of check.forbidden) {
    if (containsFormatIndependentPhrase(source, phrase)) {
      errors.push(`${check.file}: remove stale phrase "${phrase}"`);
    }
  }
  for (const phrase of check.required) {
    if (!containsFormatIndependentPhrase(source, phrase)) {
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

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getLiteralMutationMethod(node) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isIdentifier(node.expression) ||
    (node.expression.text !== "fetch" && node.expression.text !== "apiFetch")
  ) {
    return null;
  }

  const options = node.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return null;
  const methodProperty = options.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === "method") ||
        (ts.isStringLiteral(property.name) && property.name.text === "method")),
  );
  if (!methodProperty || !ts.isPropertyAssignment(methodProperty)) return null;
  const value = methodProperty.initializer;
  if (!ts.isStringLiteralLike(value)) return null;
  const method = value.text.toUpperCase();
  return mutationMethods.has(method) ? method : null;
}

function getFunctionBoundary(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current)) return current;
  }
  return node.getSourceFile();
}

function hasResponseOkCheck(boundary, responseName) {
  let checked = false;

  function visit(node) {
    if (node !== boundary && ts.isFunctionLike(node)) return;
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === responseName &&
      node.name.text === "ok"
    ) {
      checked = true;
      return;
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === responseName &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === "ok"
    ) {
      checked = true;
      return;
    }
    if (!checked) ts.forEachChild(node, visit);
  }

  visit(boundary);
  return checked;
}

function findAwaitExpression(node, boundary) {
  for (
    let current = node.parent;
    current && current !== boundary;
    current = current.parent
  ) {
    if (ts.isAwaitExpression(current)) return current;
    if (ts.isFunctionLike(current)) return null;
  }
  return null;
}

function findAssignedResponseName(awaitExpression) {
  const parent = awaitExpression.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isIdentifier(parent.left)
  ) {
    return parent.left.text;
  }
  return null;
}

function isForwardedResponse(node, boundary) {
  let current = node;
  while (
    current.parent &&
    (ts.isParenthesizedExpression(current.parent) ||
      ts.isAwaitExpression(current.parent))
  ) {
    current = current.parent;
  }
  if (ts.isReturnStatement(current.parent)) return true;
  return ts.isArrowFunction(boundary) && boundary.body === current;
}

function findUncheckedMutationResponses(source, relativePath) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];

  function visit(node) {
    const method = getLiteralMutationMethod(node);
    if (method) {
      const boundary = getFunctionBoundary(node);
      const awaitExpression = findAwaitExpression(node, boundary);
      const location = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      const prefix = `${relativePath}:${location.line + 1}:${location.character + 1}`;

      if (awaitExpression) {
        const responseName = findAssignedResponseName(awaitExpression);
        if (responseName) {
          if (!hasResponseOkCheck(boundary, responseName)) {
            violations.push(
              `${prefix} uses ${method} response "${responseName}" without checking response.ok`,
            );
          }
        } else if (!isForwardedResponse(node, boundary)) {
          violations.push(
            `${prefix} ignores the HTTP status of a ${method} response`,
          );
        }
      } else if (!isForwardedResponse(node, boundary)) {
        violations.push(
          `${prefix} does not await or forward a ${method} response`,
        );
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function getStaticMemberName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (
    ts.isElementAccessExpression(node) &&
    node.argumentExpression &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    return node.argumentExpression.text;
  }
  return null;
}

function getMemberOwner(node) {
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  ) {
    return node.expression;
  }
  return null;
}

function isAnchorCreationCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const owner = getMemberOwner(node.expression);
  const tagName = node.arguments[0];
  return (
    getStaticMemberName(node.expression) === "createElement" &&
    owner !== null &&
    ts.isIdentifier(owner) &&
    owner.text === "document" &&
    tagName !== undefined &&
    ts.isStringLiteralLike(tagName) &&
    tagName.text.toLowerCase() === "a"
  );
}

function findDirectAnchorDownloadClicks(source, relativePath) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const anchorNames = new Set();
  const violations = [];

  function collectAnchors(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isAnchorCreationCall(node.initializer)
    ) {
      anchorNames.add(node.name.text);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      isAnchorCreationCall(node.right)
    ) {
      anchorNames.add(node.left.text);
    }
    ts.forEachChild(node, collectAnchors);
  }

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const owner = getMemberOwner(node.expression);
      if (
        getStaticMemberName(node.expression) === "click" &&
        owner !== null &&
        ((ts.isIdentifier(owner) && anchorNames.has(owner.text)) ||
          isAnchorCreationCall(owner))
      ) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} directly clicks a generated download anchor instead of using requestTextDownload`,
        );
      }
    }
    ts.forEachChild(node, visit);
  }

  collectAnchors(sourceFile);
  visit(sourceFile);
  return violations;
}

function isClipboardWriteCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const writeOwner = getMemberOwner(node.expression);
  if (getStaticMemberName(node.expression) !== "writeText" || !writeOwner) {
    return false;
  }
  const clipboardOwner = getMemberOwner(writeOwner);
  return (
    getStaticMemberName(writeOwner) === "clipboard" &&
    clipboardOwner !== null &&
    ts.isIdentifier(clipboardOwner) &&
    clipboardOwner.text === "navigator"
  );
}

function isEmptyRejectionHandler(handler) {
  if (!handler) return true;
  if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
    if (ts.isBlock(handler.body)) return handler.body.statements.length === 0;
    return ts.isIdentifier(handler.body) && handler.body.text === "undefined";
  }
  return false;
}

function findUncheckedClipboardWrites(source, relativePath) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];

  function visit(node) {
    if (isClipboardWriteCall(node)) {
      const boundary = getFunctionBoundary(node);
      let handled = false;
      let swallowed = false;

      for (
        let parent = node.parent;
        parent && parent !== boundary;
        parent = parent.parent
      ) {
        if (
          ts.isTryStatement(parent) &&
          parent.catchClause &&
          parent.tryBlock.pos <= node.pos &&
          node.end <= parent.tryBlock.end
        ) {
          if (parent.catchClause.block.statements.length === 0)
            swallowed = true;
          else handled = true;
        }

        if (
          ts.isCallExpression(parent) &&
          (ts.isPropertyAccessExpression(parent.expression) ||
            ts.isElementAccessExpression(parent.expression))
        ) {
          const method = getStaticMemberName(parent.expression);
          const handler =
            method === "catch"
              ? parent.arguments[0]
              : method === "then"
                ? parent.arguments[1]
                : undefined;
          if (method === "catch" || (method === "then" && handler)) {
            if (isEmptyRejectionHandler(handler)) swallowed = true;
            else handled = true;
          }
        }
      }

      if (swallowed || (!handled && !isForwardedResponse(node, boundary))) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        violations.push(
          `${relativePath}:${location.line + 1}:${location.character + 1} ${
            swallowed
              ? "silently swallows clipboard failure"
              : "does not handle or forward clipboard failure"
          }`,
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

const mutationFixtureViolations = findUncheckedMutationResponses(
  `
    async function unchecked() {
      const response = await fetch("/unchecked", { method: "POST" });
      return response.json();
    }
    async function ignored() {
      await fetch("/ignored", { method: "DELETE" });
    }
    async function checked() {
      const response = await fetch("/checked", { method: "PATCH" });
      if (!response.ok) throw new Error("failed");
      return response.json();
    }
    async function uncheckedProtected() {
      const response = await apiFetch("/unchecked-protected", { method: "POST" });
      return response.json();
    }
    async function checkedProtected() {
      const response = await apiFetch("/checked-protected", { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      return response.json();
    }
    function forwarded() {
      return fetch("/forwarded", { method: "PUT" });
    }
    async function dynamic(method) {
      await fetch("/dynamic", { method });
    }
  `,
  "client-mutation-fixture.tsx",
);
if (mutationFixtureViolations.length !== 3) {
  errors.push(
    "client mutation truth: AST self-test must reject unchecked or ignored literal fetch/apiFetch mutations while accepting checked, forwarded, and dynamic responses",
  );
}

const clipboardFixtureViolations = findUncheckedClipboardWrites(
  `
    async function unhandled() {
      await navigator.clipboard.writeText("unhandled");
    }
    function swallowed() {
      void navigator.clipboard.writeText("swallowed").catch(() => {});
    }
    async function bracketSwallowed() {
      try {
        await navigator["clipboard"]["writeText"]("bracket");
      } catch {}
    }
    async function guarded() {
      try {
        await navigator.clipboard.writeText("guarded");
      } catch {
        reportFailure();
      }
    }
    function delegated() {
      return navigator.clipboard.writeText("delegated").catch(reportFailure);
    }
    function forwarded() {
      return navigator.clipboard.writeText("forwarded");
    }
  `,
  "clipboard-feedback-fixture.tsx",
);
if (clipboardFixtureViolations.length !== 3) {
  errors.push(
    "clipboard feedback: AST self-test must reject unhandled and empty rejection paths while accepting substantive handlers and forwarded promises",
  );
}

const downloadFixtureViolations = findDirectAnchorDownloadClicks(
  `
    function directDownload() {
      const anchor = document.createElement("a");
      anchor.click();
    }
    function bracketDownload() {
      const link = document["createElement"]("a");
      link["click"]();
    }
    function assignedDownload() {
      let link;
      link = document.createElement("a");
      link.click();
    }
    function chainedDownload() {
      document.createElement("a").click();
    }
    function fileInput(input) {
      input.click();
    }
    function delegatedDownload() {
      requestTextDownload({ filename: "safe.json", content: "{}", label: "Safe" });
    }
  `,
  "download-feedback-fixture.tsx",
);
if (downloadFixtureViolations.length !== 4) {
  errors.push(
    "download feedback: AST self-test must reject direct generated-anchor clicks while accepting file-input activation and shared-helper delegation",
  );
}

for (const { relativePath, source } of [
  ...collectTsxSources("app"),
  ...collectTsxSources("components"),
]) {
  errors.push(...findIgnoredPromiseChains(source, relativePath));
  errors.push(...findUncheckedMutationResponses(source, relativePath));
  errors.push(...findUncheckedClipboardWrites(source, relativePath));
  errors.push(...findDirectAnchorDownloadClicks(source, relativePath));
}

if (errors.length > 0) {
  console.error("Secondary surface polish validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Secondary surface polish OK (camera, drone, IoT, voice, client mutation, clipboard, download, and operator-result states are explicit).",
);
