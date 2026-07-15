#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();

const requiredFiles = [
  "middleware.ts",
  "lib/security/routePolicy.ts",
  "lib/security/rateLimit.ts",
  "lib/security/protectedActionTelemetry.ts",
  "lib/security/stepUpAuth.ts",
  "lib/security/toolCapabilityPolicy.ts",
  "lib/security/runtimePolicyCookies.ts",
];

const requiredMiddlewareSignals = [
  "getRoutePolicy",
  "isRouteAllowedInMode",
  "NEXUS_INTERNAL_AUTH_HEADER",
  "hasAuthenticatedNexusSession",
  "isTrustedInternalHost",
  "policy.public",
  "Unknown API route",
];

const requiredRoutePolicySignals = [
  "ROUTE_POLICIES",
  "getRoutePolicy",
  "isRouteAllowedInMode",
  "readNetworkMode",
  "matches.sort",
  "connector_opt_in",
  "high_risk",
  "local_only",
];

const sensitivePrefixes = [
  "/api/ai",
  "/api/tools",
  "/api/settings",
  "/api/project",
  "/api/verify",
  "/api/diagnostics",
  "/api/memory",
  "/api/vehicle/telemetry",
  "/api/workflows",
  "/api/workflow-runs",
  "/api/registry",
  "/api/mqtt",
  "/api/telegram",
  "/api/agent-reach",
];

const expectedHighRiskPrefixes = [
  "/api/mqtt",
  "/api/telegram",
  "/api/agent-reach",
  "/api/legal-compliance/drone",
];

function readText(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function addFinding(findings, message) {
  findings.push(message);
}

function getObjectProperty(object, propertyName) {
  return object.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === propertyName) ||
        (ts.isStringLiteralLike(property.name) &&
          property.name.text === propertyName)),
  );
}

function parsePolicies(src) {
  const policies = [];
  const sourceFile = ts.createSourceFile(
    "routePolicy.ts",
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "ROUTE_POLICIES" &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const element of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const prefixProperty = getObjectProperty(element, "prefix");
        const routeClassProperty = getObjectProperty(element, "routeClass");
        const publicProperty = getObjectProperty(element, "public");
        if (
          !prefixProperty ||
          !routeClassProperty ||
          !publicProperty ||
          !ts.isPropertyAssignment(prefixProperty) ||
          !ts.isPropertyAssignment(routeClassProperty) ||
          !ts.isPropertyAssignment(publicProperty) ||
          !ts.isStringLiteralLike(prefixProperty.initializer) ||
          !ts.isStringLiteralLike(routeClassProperty.initializer) ||
          (publicProperty.initializer.kind !== ts.SyntaxKind.TrueKeyword &&
            publicProperty.initializer.kind !== ts.SyntaxKind.FalseKeyword)
        ) {
          continue;
        }
        policies.push({
          prefix: prefixProperty.initializer.text,
          routeClass: routeClassProperty.initializer.text,
          public: publicProperty.initializer.kind === ts.SyntaxKind.TrueKeyword,
        });
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return policies;
}

function findPolicyForPrefix(policies, prefix) {
  return policies
    .filter(
      (policy) => prefix === policy.prefix || prefix.startsWith(`${policy.prefix}/`),
    )
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

function findChildPoliciesForPrefix(policies, prefix) {
  return policies.filter((policy) => policy.prefix.startsWith(`${prefix}/`));
}

function main() {
  const findings = [];

  for (const file of requiredFiles) {
    if (!existsSync(join(root, file))) {
      addFinding(findings, `Missing required security boundary file: ${file}`);
    }
  }

  if (findings.length > 0) {
    console.log(`Security boundary validation found ${findings.length} issue(s):`);
    for (const finding of findings) console.log(`- ${finding}`);
    process.exit(1);
  }

  const middleware = readText("middleware.ts");
  const routePolicy = readText("lib/security/routePolicy.ts");
  const policies = parsePolicies(routePolicy);

  for (const signal of requiredMiddlewareSignals) {
    if (!middleware.includes(signal)) {
      addFinding(findings, `middleware.ts missing security signal: ${signal}`);
    }
  }

  for (const signal of requiredRoutePolicySignals) {
    if (!routePolicy.includes(signal)) {
      addFinding(findings, `routePolicy.ts missing security signal: ${signal}`);
    }
  }

  if (policies.length < 20) {
    addFinding(findings, "ROUTE_POLICIES parsed fewer than 20 route policies.");
  }

  const publicPolicies = policies.filter((policy) => policy.public);
  const unexpectedPublic = publicPolicies.filter(
    (policy) =>
      !["/api/token", "/api/health", "/api/auth-diagnostics"].includes(policy.prefix),
  );
  for (const policy of unexpectedPublic) {
    addFinding(findings, `Unexpected public API route policy: ${policy.prefix}`);
  }

  for (const prefix of sensitivePrefixes) {
    const policy = findPolicyForPrefix(policies, prefix);
    if (!policy) {
      const childPolicies = findChildPoliciesForPrefix(policies, prefix);
      if (childPolicies.length === 0) {
        addFinding(findings, `Sensitive prefix has no route policy: ${prefix}`);
      }
      for (const childPolicy of childPolicies) {
        if (childPolicy.public) {
          addFinding(
            findings,
            `Sensitive child prefix must not be public: ${childPolicy.prefix}`,
          );
        }
      }
      continue;
    }
    if (policy.public) {
      addFinding(findings, `Sensitive prefix must not be public: ${prefix}`);
    }
  }

  for (const prefix of expectedHighRiskPrefixes) {
    const policy = findPolicyForPrefix(policies, prefix);
    if (!policy) {
      addFinding(findings, `High-risk prefix has no route policy: ${prefix}`);
    } else if (policy.routeClass !== "high_risk") {
      addFinding(
        findings,
        `High-risk prefix ${prefix} should be high_risk, found ${policy.routeClass}`,
      );
    }
  }

  if (findings.length > 0) {
    console.log(`Security boundary validation found ${findings.length} issue(s):`);
    for (const finding of findings) console.log(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Security boundary OK (middleware, route policy, protected helpers, high-risk routes, and protected 401/403 posture are wired).",
  );
}

main();
