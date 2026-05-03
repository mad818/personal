#!/usr/bin/env node

function parseArgs() {
  const args = process.argv.slice(2);
  const readFlag = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] || "" : "";
  };
  return {
    tool: readFlag("--tool"),
    input64: readFlag("--input64"),
  };
}

function ok(result) {
  process.stdout.write(JSON.stringify({ ok: true, result }));
  process.exit(0);
}

function fail(error) {
  process.stderr.write(String(error));
  process.exit(1);
}

async function runN8nWorkflow(input) {
  const workflowId = String(input.workflow_id || "").trim();
  if (!workflowId) {
    return "n8n_run_workflow: workflowId is required.";
  }

  const payload =
    typeof input.payload === "string"
      ? (() => {
          try {
            return JSON.parse(input.payload);
          } catch {
            return {};
          }
        })()
      : input.payload && typeof input.payload === "object"
        ? input.payload
        : {};

  const baseUrl = String(process.env.N8N_BASE_URL || "").trim();
  if (!baseUrl) {
    return "Could not reach n8n. Make sure it is running (see docs/deployment/n8n.md).";
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.N8N_API_KEY
            ? { "X-N8N-API-KEY": process.env.N8N_API_KEY }
            : {}),
        },
        body: JSON.stringify({ data: payload }),
      },
    );
    if (!response.ok) {
      return `n8n returned HTTP ${response.status}. Make sure n8n is running and the workflow ID is correct.`;
    }
    const json = await response.json();
    const execId = json?.data?.executionId ?? json?.executionId ?? "unknown";
    return `Workflow ${workflowId} triggered — execution ID: ${execId}`;
  } catch {
    return "Could not reach n8n. Make sure it is running (see docs/deployment/n8n.md).";
  }
}

async function main() {
  const { tool, input64 } = parseArgs();
  if (!tool || !input64) {
    fail("Missing tool isolation runner arguments.");
    return;
  }

  let input;
  try {
    input = JSON.parse(Buffer.from(input64, "base64url").toString("utf-8"));
  } catch {
    fail("Tool isolation input payload is invalid.");
    return;
  }

  switch (tool) {
    case "n8n_run_workflow":
      ok(await runN8nWorkflow(input));
      return;
    default:
      fail(`Unsupported isolated tool: ${tool}`);
  }
}

void main();
